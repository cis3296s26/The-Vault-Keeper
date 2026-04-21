// --- Hex / byte conversion helpers -------------------------------------------
//
// The browser's crypto API works with raw bytes (Uint8Array).
// The database stores those bytes as hex strings like "a3f2c8...".
// These two helpers convert between the two formats.

// hexToBytes: turns a hex string back into raw bytes so the crypto API can use them.
//   Example: "ff00" → Uint8Array [255, 0]
//   How it works:
//     hex.match(/.{2}/g)        - splits the string into 2-character chunks: ["ff", "00"]
//     .map(b => parseInt(b, 16)) - converts each hex chunk to a number (base 16): [255, 0]
//     new Uint8Array(...)        - wraps the numbers in a typed byte array
function hexToBytes(hex) {
    return new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
}

// bytesToHex: turns raw bytes into a hex string so they can be stored in the database.
//   Example: Uint8Array [255, 0] → "ff00"
//   How it works:
//     Array.from(bytes)            - converts Uint8Array to a plain JS array so .map() works
//     .map(b => b.toString(16)     - converts each number to its hex representation: 255 → "ff"
//     .padStart(2, '0'))           - ensures single-digit hex values get a leading zero: "f" → "0f"
//     .join('')                    - joins all the chunks into one continuous string: ["ff","00"] → "ff00"
function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Key derivation -----------------------------------------------------------
//
// AES encryption requires a fixed-length binary key (256 bits = 32 bytes).
// A user-typed password is a variable-length string, so we can't use it directly.
// deriveKey runs PBKDF2, which is a one-way function that stretches the password
// into a proper key. The salt is mixed in so that the same password always
// produces a different key for each file.

// async means this function is asynchronous - it will pause at each 'await' line
// until the browser's crypto API finishes its work, then continue.
async function deriveKey(password, salt) {
    // TextEncoder converts the password string into raw bytes.
    // The crypto API only accepts bytes, not plain strings.
    const enc = new TextEncoder();

    // importKey tells the browser: "treat these raw password bytes as key material
    // for PBKDF2". The result is not yet a usable AES key - it's an intermediate
    // object the browser holds internally.
    //   'raw'              - the format we are importing (plain bytes, not a file format)
    //   enc.encode(password) - the password converted to bytes
    //   { name: 'PBKDF2' } - the algorithm this material will be used with
    //   false              - not exportable (the browser won't let JS read the raw key back out)
    //   ['deriveKey']      - the only allowed use is deriving another key
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    // deriveKey runs PBKDF2 to produce the final AES key.
    //   name: 'PBKDF2'       - the key-derivation algorithm
    //   salt                 - the random bytes mixed into derivation (unique per file)
    //   iterations: 100000   - PBKDF2 repeats its hash 100,000 times to make brute-force slow
    //   hash: 'SHA-256'      - the hashing algorithm used in each of those 100,000 rounds
    //   { name: 'AES-GCM', length: 256 } - the output should be a 256-bit AES-GCM key
    //   false                - not exportable
    //   ['encrypt', 'decrypt'] - this key is allowed to encrypt and decrypt
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// --- Public API ---------------------------------------------------------------

// encryptFile: encrypts a file's raw bytes using the given password.
// Called during upload when the user has checked "password protect".
//
// Parameters:
//   arrayBuffer - the raw bytes of the file the user selected (from file.arrayBuffer())
//   password    - the string the user typed into the password field
//
// Returns an object with three properties:
//   encrypted   - the scrambled file bytes (ArrayBuffer); this is what gets uploaded
//   salt        - hex string of the random salt; stored in the database
//   iv          - hex string of the random IV; stored in the database
export async function encryptFile(arrayBuffer, password) {
    // Generate a fresh random salt (16 bytes) for this specific file.
    // crypto.getRandomValues fills a Uint8Array with cryptographically random bytes.
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Generate a fresh random IV (12 bytes). AES-GCM requires 12 bytes specifically.
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive a 256-bit AES key from the password + salt using PBKDF2.
    const key = await deriveKey(password, salt);

    // Encrypt the file bytes.
    //   { name: 'AES-GCM', iv } - use AES-GCM mode with our random IV
    //   key                     - the derived key
    //   arrayBuffer             - the raw file bytes to encrypt
    // The result is an ArrayBuffer of the same size as the original, but scrambled.
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);

    // Return all three pieces. The encrypted bytes go to the server as the file.
    // The salt and iv are converted to hex strings so they can be stored as text in the database.
    return {
        encrypted,
        salt: bytesToHex(salt),
        iv: bytesToHex(iv),
    };
}

// decryptFile: reverses encryptFile using the salt and iv retrieved from the database.
// Called during download when the user enters their password.
//
// Parameters:
//   arrayBuffer - the encrypted bytes downloaded from the server
//   password    - the string the user types when prompted
//   saltHex     - the salt hex string stored in the database for this file
//   ivHex       - the iv hex string stored in the database for this file
//
// Returns the original file bytes (ArrayBuffer) if the password is correct.
// Throws an error if the password is wrong - AES-GCM detects tampering/wrong keys
// via its built-in authentication tag and refuses to produce any output.
export async function decryptFile(arrayBuffer, password, saltHex, ivHex) {
    // Convert the hex strings back to byte arrays so the crypto API can use them.
    const salt = hexToBytes(saltHex);
    const iv = hexToBytes(ivHex);

    // Re-derive the exact same key. Because PBKDF2 is deterministic, the same
    // password + same salt always produces the same key.
    const key = await deriveKey(password, salt);

    // Decrypt and return the original file bytes.
    // If the password was wrong, deriveKey produces the wrong key, and AES-GCM's
    // authentication check fails here - the browser throws an error instead of
    // returning garbage data.
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);
}
