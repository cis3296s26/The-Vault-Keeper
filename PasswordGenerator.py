import secrets
import string

def passwordGenerator(length: int):
    # The type in variable_name: type = value is optional
    # chars is an iterable string with all letters, digits, and punctuation marks
    chars: str = string.ascii_letters + string.digits + string.punctuation

    # secrets reads from chars to pick the characters for password
    # Iterate length times over chars, picking a random password character on each iteration
    password: str = ''.join(secrets.choice(chars) for i in range(length))
    return password

print(passwordGenerator(15))