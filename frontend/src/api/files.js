const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

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
    window.open(`${BASE_URL}${data.url}`, '_blank')  // prepend BASE_URL
}

export const deleteFile = async (fileId) => {
    await fetch(`${BASE_URL}/api/files/${fileId}`, { method: 'DELETE' })
}