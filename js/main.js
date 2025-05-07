// js/main.js

// Remplace par ta propre config !
const firebaseConfig = {
  apiKey: "AIzaSyBgXjpvYBm58t3_wOx796ZZ3qMS8EIPNLg",
  authDomain: "testjeu-d5b67.firebaseapp.com",
  projectId: "testjeu-d5b67",
  storageBucket: "testjeu-d5b67.firebasestorage.app",
  messagingSenderId: "696570393534",
  appId: "1:696570393534:web:38f021a51104f8731b3fef"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Utilitaires pour localStorage
function getEvents() {
    return JSON.parse(localStorage.getItem('evenements') || '[]');
  }
  function saveEvents(events) {
    localStorage.setItem('evenements', JSON.stringify(events));
  }
  function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Affiche la liste des événements
  async function renderEventList() {
    const events = await getEvenements();
    const list = document.getElementById('event-list');
    list.innerHTML = '';
    if (events.length === 0) {
      list.innerHTML = '<li>Aucun événement pour le moment.</li>';
      return;
    }
    events.forEach(ev => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div><strong>${ev.nom}</strong> (${ev.date})</div>
        <div style="color:#555; margin-bottom:4px;">${ev.description || ''}</div>
        <a href="evenement.html?id=${ev.id}" style="color:#2563eb;font-weight:600;">Voir cet événement</a>
      `;
      list.appendChild(li);
    });
  }
  
  // Gestion du formulaire de création
  document.addEventListener('DOMContentLoaded', () => {
    renderEventList();
  
    const showBtn = document.getElementById('show-create-form');
    const modal = document.getElementById('create-event-form');
    const cancelBtn = document.getElementById('cancel-create');
    const form = document.getElementById('event-form');
  
    showBtn.onclick = () => { modal.style.display = 'flex'; };
    cancelBtn.onclick = () => { modal.style.display = 'none'; };
  
    form.onsubmit = async function(e) {
      e.preventDefault();
      const nom = document.getElementById('event-name').value.trim();
      const description = document.getElementById('event-desc').value.trim();
      const date = document.getElementById('event-date').value;
      if (!nom || !date) return;
  
      const id = await ajouterEvenement({
        nom,
        description,
        date
      });
      this.reset();
      document.getElementById('create-event-form').style.display = 'none';
      window.location.href = `evenement.html?id=${id}`;
    };
  });

async function ajouterEvenement(evenement) {
  const docRef = await db.collection("evenements").add({
    ...evenement,
    equipes: [],
    tournois: []
  });
  return docRef.id;
}

async function getEvenements() {
  const snapshot = await db.collection("evenements").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}