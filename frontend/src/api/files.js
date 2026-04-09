const BASE_URL = "http://localhost:8000/api/files"

export const getFiles = async () => {
    const res = await fetch(`${BASE_URL}/`)
    return res.json()
}

export const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE_URL}/upload`, {
        method: 'POST',
        body: formData
    })
    return res.json()
}

export const viewFile = async (fileId) => {
    const res = await fetch(`${BASE_URL}/view/${fileId}`)
    const data = await res.json()
    window.open(data.url, '_blank')
}

export const deleteFile = async (fileId) => {
    await fetch(`${BASE_URL}/${fileId}`, { method: 'DELETE' })
}