let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadPeople();

    // Form Submit
    document.getElementById('entryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const url = editingId ? `/api/people/${editingId}` : '/api/people';
        const method = editingId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                body: formData // Content-Type is auto-set for FormData
            });

            if (response.ok) {
                resetForm();
                loadPeople();
                alert(editingId ? 'Updated successfully' : 'Saved successfully');
            } else {
                const errData = await response.json();
                alert('Error saving data: ' + (errData.error || response.statusText));
                console.error('Save error:', errData);
            }
        } catch (err) {
            console.error(err);
        }
    });

    // Logout
    document.getElementById('logoutBtn').click = logout;
});

async function loadPeople() {
    const response = await fetch('/api/people');
    const people = await response.json();
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    people.forEach(person => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${person.photo_url ? `<img src="${person.photo_url}" class="photo-preview" style="width: 50px; height: 50px;">` : 'No Photo'}
            </td>
            <td>${person.name}</td>
            <td>${person.age}</td>
            <td>${person.place}</td>
            <td>${person.updated_by || person.created_by}</td>
            <td class="action-buttons">
                <button class="action-btn" onclick="editPerson(${person.id}, '${person.name}', ${person.age}, '${person.place}', '${person.photo_url}')">Edit</button>
                <button class="action-btn" onclick="window.open('single_report.html?id=${person.id}', '_blank')">Single Report</button>
                <button class="action-btn btn-danger" style="background:none; color:red; border:1px solid red;" onclick="deletePerson(${person.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editPerson(id, name, age, place, photo) {
    editingId = id;
    document.getElementById('name').value = name;
    document.getElementById('age').value = age;
    document.getElementById('place').value = place;
    document.querySelector('button[type="submit"]').textContent = "Update";

    // Show preview if needed
    const preview = document.getElementById('photoPreview');
    if (photo && photo !== 'null') {
        preview.src = photo;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

async function deletePerson(id) {
    if (!confirm('Are you sure?')) return;
    await fetch(`/api/people/${id}`, { method: 'DELETE' });
    loadPeople();
}

function resetForm() {
    editingId = null;
    document.getElementById('entryForm').reset();
    document.querySelector('button[type="submit"]').textContent = "Add";
    document.getElementById('photoPreview').style.display = 'none';
}

function printReport() {
    window.print();
}

// Photo preview on file select
document.getElementById('photo').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('photoPreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
});
