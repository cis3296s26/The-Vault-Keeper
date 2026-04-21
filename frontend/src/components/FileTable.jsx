import { decryptFile } from '../utils/crypto'

const handleView = async (file) => {
    const meta = await fetch(`${BASE_URL}/api/files/view/${file.id}`).then(r => r.json())

    if (meta.is_protected) {
        const password = prompt('Enter file password:')
        if (!password) return

        const res = await fetch(`${BASE_URL}${meta.url}`)
        const encrypted = await res.arrayBuffer()

        let decrypted
        try {
            decrypted = await decryptFile(encrypted, password, meta.salt, meta.iv)
        } catch {
            alert('Incorrect password or corrupted file.')
            return
        }

        const url = URL.createObjectURL(new Blob([decrypted]))
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
    } else {
        window.open(`${BASE_URL}${meta.url}`, '_blank')
    }
}