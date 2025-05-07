// js/evenement.js

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


function getEvents() {
    return JSON.parse(localStorage.getItem('evenements') || '[]');
  }
  function saveEvents(events) {
    localStorage.setItem('evenements', JSON.stringify(events));
  }
  function getEventIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }
  function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Mélange un tableau (Fisher-Yates)
  function melanger(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  let event = null;
  
  function renderEventInfo() {
    document.getElementById('event-title').textContent = event.nom;
    document.getElementById('event-desc').textContent = event.description;
    document.getElementById('event-date').textContent = "Date : " + event.date;
  }
  
  function renderEquipes(event) {
    const equipesDiv = document.getElementById('equipes');
    equipesDiv.innerHTML = '';
    if (!event.equipes || event.equipes.length === 0) return;
    event.equipes.forEach((equipe, idx) => {
      const div = document.createElement('div');
      div.className = 'equipe';
      div.innerHTML = `<h3>Équipe ${idx + 1}</h3><ul>${equipe.membres.map(p => `<li>${p}</li>`).join('')}</ul>`;
      equipesDiv.appendChild(div);
    });
  }
  
  function renderTournaments() {
    const list = document.getElementById('tournament-list');
    list.innerHTML = '';
    if (!event.tournois || event.tournois.length === 0) {
      list.innerHTML = '<li>Aucun tournoi pour cet événement.</li>';
      return;
    }
    event.tournois.forEach(t => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${t.nom}</strong> (${t.dateDebut}) - <em>${t.statut}</em>
        <a href="tournoi.html?event=${event.id}&tournoi=${t.id}" style="color:#2563eb;">Voir</a>`;
      list.appendChild(li);
    });
  }
  
  async function getEvenementById(id) {
    const doc = await db.collection("evenements").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
  
  async function updateEquipes(eventId, equipes) {
    await db.collection("evenements").doc(eventId).update({ equipes });
  }
  
  async function updateTournois(eventId, tournois) {
    await db.collection("evenements").doc(eventId).update({ tournois });
  }
  
  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    if (!eventId) {
      alert("ID d'événement manquant !");
      window.location = "index.html";
      return;
    }
    event = await getEvenementById(eventId);
    if (!event) {
      alert("Événement introuvable !");
      window.location = "index.html";
      return;
    }
    if (!event.id) {
      alert("Erreur : ID d'événement manquant !");
      return;
    }
    renderEventInfo();
    renderEquipes(event);
    renderTournaments();
  
    // Création des équipes
    document.getElementById('form-equipes').onsubmit = async function(e) {
      e.preventDefault();
      const participants = document.getElementById('participants').value
        .split('\n').map(p => p.trim()).filter(p => p.length > 0);
      const nbEquipes = parseInt(document.getElementById('nb-equipes').value, 10);
  
      if (participants.length < nbEquipes) {
        alert("Le nombre d'équipes ne peut pas dépasser le nombre de participants.");
        return;
      }
      if (nbEquipes < 2) {
        alert("Il faut au moins 2 équipes.");
        return;
      }
      const melanges = melanger([...participants]);
      const equipesTemp = Array.from({length: nbEquipes}, () => []);
      melanges.forEach((p, i) => {
        equipesTemp[i % nbEquipes].push(p);
      });
      const equipes = equipesTemp.map(membres => ({ membres }));
  
      await updateEquipes(event.id, equipes);
      event = await getEvenementById(event.id);
      renderEquipes(event);
    };
  
    // Création d'un tournoi
    document.getElementById('show-create-tournament').onclick = () => {
      document.getElementById('create-tournament-form').style.display = 'block';
    };
    document.getElementById('cancel-create-tournament').onclick = () => {
      document.getElementById('create-tournament-form').style.display = 'none';
    };
    document.getElementById('tournament-form').onsubmit = async function(e) {
      e.preventDefault();
      const nom = document.getElementById('tournament-name').value.trim();
      const description = document.getElementById('tournament-desc').value.trim();
      const dateDebut = document.getElementById('tournament-date').value;
      if (!nom || !dateDebut) return;
      if (!event.equipes || event.equipes.length < 2) {
        alert("Il faut d'abord créer au moins 2 équipes !");
        return;
      }
      event.tournois = event.tournois || [];
      event.tournois.push({
        id: generateId(),
        nom,
        description,
        dateDebut,
        statut: 'en cours',
        rounds: []
      });
      await updateTournois(event.id, event.tournois);
      this.reset();
      document.getElementById('create-tournament-form').style.display = 'none';
      renderTournaments();
    };
  });