const BASE_URL = "https://the-vault-keeper-production.up.railway.app"

export const getFiles = async () => {
    const res = await fetch(`${BASE_URL}/api/files/`)
    return res.json()
}

export const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE_URL}/api/files/upload`, {
        method: 'POST',
        body: formData
    })
    return res.json()
}

export const viewFile = async (fileId) => {
    const res = await fetch(`${BASE_URL}/api/files/view/${fileId}`)
    const data = await res.json()
    window.open(data.url, '_blank')
}

export const deleteFile = async (fileId) => {
    await fetch(`${BASE_URL}/api/files/${fileId}`, { method: 'DELETE' })
}