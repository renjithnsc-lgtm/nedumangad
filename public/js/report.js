document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadFilteredPeople();

    document.getElementById('ageFilter').addEventListener('change', loadFilteredPeople);
    document.getElementById('ageFilter').addEventListener('input', loadFilteredPeople);
});

async function loadFilteredPeople() {
    const age = document.getElementById('ageFilter').value;
    const url = age ? `/api/people?age=${age}` : '/api/people';

    const response = await fetch(url);
    const people = await response.json();
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';

    people.forEach(person => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${person.name}</td>
            <td>${person.age}</td>
            <td>${person.place}</td>
            <td>${person.updated_by || person.created_by}</td>
        `;
        tbody.appendChild(tr);
    });
}
