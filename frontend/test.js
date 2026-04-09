const response = await fetch("http://localhost:8000/api/heroes/")
const heroes = await response.json()
console.log(heroes)