// Initialisation Firebase (si pas déjà fait dans le HTML)
const firebaseConfig = {
  apiKey: "AIzaSyBgXjpvYBm58t3_wOx796ZZ3qMS8EIPNLg",
  authDomain: "testjeu-d5b67.firebaseapp.com",
  projectId: "testjeu-d5b67",
  storageBucket: "testjeu-d5b67.firebasestorage.app",
  messagingSenderId: "696570393534",
  appId: "1:696570393534:web:38f021a51104f8731b3fef"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    eventId: params.get('event'),
    tournoiId: params.get('tournoi')
  };
}

// Mélange un tableau (Fisher-Yates)
function melanger(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Structure compatible Firestore : chaque round est un objet { matches: [...] }
function createMatches(teams) {
  const matches = [];
  for (let i = 0; i < teams.length; i += 2) {
    matches.push({
      team1: teams[i] || null,
      team2: teams[i + 1] || null,
      score1: null,
      score2: null
    });
  }
  return { matches };
}

function getQualified(matches) {
  const qualified = [];
  for (const match of matches) {
    if (match.team1 && !match.team2) qualified.push(match.team1);
    else if (!match.team1 && match.team2) qualified.push(match.team2);
    else if (
      match.team1 && match.team2 &&
      match.score1 !== null && match.score2 !== null
    ) {
      if (match.score1 > match.score2) qualified.push(match.team1);
      else if (match.score2 > match.score1) qualified.push(match.team2);
      // égalité : personne ne passe (ou adapter selon ta règle)
    }
  }
  return qualified;
}

function regenerateRoundsFrom(roundIndex, tournoi) {
  // Efface tous les tours suivants
  tournoi.rounds = tournoi.rounds.slice(0, roundIndex + 1);

  // Recrée les tours suivants à partir des qualifiés
  let qualified = getQualified(tournoi.rounds[roundIndex].matches);
  while (qualified.length > 1) {
    tournoi.rounds.push(createMatches(qualified));
    qualified = getQualified(tournoi.rounds[tournoi.rounds.length - 1].matches);
  }
}

function renderTournament(tournoi, event) {
  document.getElementById('tournament-title').textContent = tournoi.nom;
  document.getElementById('tournament-desc').textContent = tournoi.description;
  document.getElementById('tournament-date').textContent = "Début : " + tournoi.dateDebut;
  document.getElementById('tournament-status').textContent = "Statut : " + tournoi.statut;

  const tournamentTree = document.getElementById('tournament-tree');
  tournamentTree.innerHTML = '';
  for (let roundIdx = 0; roundIdx < tournoi.rounds.length; roundIdx++) {
    const round = tournoi.rounds[roundIdx];
    const roundDiv = document.createElement('div');
    roundDiv.className = 'round';

    for (let matchIdx = 0; matchIdx < round.matches.length; matchIdx++) {
      const match = round.matches[matchIdx];
      const matchDiv = document.createElement('div');
      matchDiv.className = 'match';

      let team1Name = match.team1 ? match.team1.membres.join(', ') : '-';
      let team2Name = match.team2 ? match.team2.membres.join(', ') : '-';

      let winnerIdx = null;
      if (match.team1 && !match.team2) winnerIdx = 0;
      else if (!match.team1 && match.team2) winnerIdx = 1;
      else if (
        match.team1 && match.team2 &&
        match.score1 !== null && match.score2 !== null
      ) {
        if (match.score1 > match.score2) winnerIdx = 0;
        else if (match.score2 > match.score1) winnerIdx = 1;
      }

      const isFinal = (roundIdx === tournoi.rounds.length - 1 && round.matches.length === 1);
      matchDiv.innerHTML = `
        <div class="match-team${winnerIdx === 0 ? ' match-winner' : ''}">
          <span class="team-name">${team1Name}</span>
          <input type="number" min="0" class="score" data-round="${roundIdx}" data-match="${matchIdx}" data-team="1"
            value="${match.score1 !== null ? match.score1 : ''}"
            ${!match.team1 || !match.team2 || tournoi.statut === 'terminé' ? 'disabled' : ''}>
        </div>
        <div class="match-team${winnerIdx === 1 ? ' match-winner' : ''}">
          <span class="team-name">${team2Name}</span>
          <input type="number" min="0" class="score" data-round="${roundIdx}" data-match="${matchIdx}" data-team="2"
            value="${match.score2 !== null ? match.score2 : ''}"
            ${!match.team1 || !match.team2 || tournoi.statut === 'terminé' ? 'disabled' : ''}>
        </div>
        ${isFinal ? '<div style="text-align:center;font-size:2em;margin-top:10px;">🏆 Finale</div>' : ''}
      `;
      roundDiv.appendChild(matchDiv);
    }
    tournamentTree.appendChild(roundDiv);
  }

  // Ajoute les écouteurs d'événements pour les scores
  if (tournoi.statut !== 'terminé') {
    document.querySelectorAll('.score').forEach(input => {
      input.addEventListener('change', async function() {
        const round = parseInt(this.dataset.round);
        const match = parseInt(this.dataset.match);
        const team = parseInt(this.dataset.team);

        const value = this.value === '' ? null : parseInt(this.value, 10);
        if (team === 1) tournoi.rounds[round].matches[match].score1 = value;
        else tournoi.rounds[round].matches[match].score2 = value;

        // Régénère tous les tours suivants à partir de ce tour
        regenerateRoundsFrom(round, tournoi);

        // Si la finale est jouée, statut = terminé
        const lastRound = tournoi.rounds[tournoi.rounds.length - 1];
        if (
          lastRound.matches.length === 1 &&
          lastRound.matches[0].score1 !== null &&
          lastRound.matches[0].score2 !== null &&
          lastRound.matches[0].team1 && lastRound.matches[0].team2
        ) {
          tournoi.statut = 'terminé';
        }

        // SAUVEGARDE DANS FIRESTORE
        const idx = event.tournois.findIndex(t => t.id === tournoi.id);
        if (idx !== -1) {
          event.tournois[idx] = tournoi;
          await updateTournois(event.id, event.tournois);
        }

        renderTournament(tournoi, event);
      });
    });
  }

  // Affichage du vainqueur à la fin
  const lastRound = tournoi.rounds[tournoi.rounds.length - 1];
  if (tournoi.statut === 'terminé' && lastRound.matches.length === 1) {
    const match = lastRound.matches[0];
    let winner = null;
    if (match.score1 > match.score2) winner = match.team1;
    else if (match.score2 > match.score1) winner = match.team2;
    if (winner) {
      const winnerDiv = document.createElement('div');
      winnerDiv.style = "margin-top:30px;text-align:center;font-size:1.4em;font-weight:700;color:#16a34a;";
      winnerDiv.innerHTML = `🏆 <span>Vainqueur : ${winner.membres.join(', ')}</span>`;
      tournamentTree.appendChild(winnerDiv);
    }
  }
}

async function getEvenementById(id) {
  const doc = await db.collection("evenements").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function updateTournois(eventId, tournois) {
  await db.collection("evenements").doc(eventId).update({ tournois });
}

document.addEventListener('DOMContentLoaded', async () => {
  const { eventId, tournoiId } = getParams();
  if (!eventId) {
    alert("ID d'événement manquant !");
    window.location = "index.html";
    return;
  }
  const event = await getEvenementById(eventId);
  if (!event) {
    alert("Événement introuvable !");
    window.location = "index.html";
    return;
  }
  const tournoi = (event.tournois || []).find(t => t.id === tournoiId);
  if (!tournoi) {
    alert("Tournoi introuvable !");
    window.location = `evenement.html?id=${eventId}`;
    return;
  }

  // Génération ou lecture de l'arbre
  if (!tournoi.rounds || tournoi.rounds.length === 0) {
    const equipes = melanger([...event.equipes]);
    tournoi.rounds = [createMatches(equipes)];
    regenerateRoundsFrom(0, tournoi);
    // Sauvegarde la progression complète
    const idx = event.tournois.findIndex(t => t.id === tournoi.id);
    if (idx !== -1) {
      event.tournois[idx] = tournoi;
      await updateTournois(event.id, event.tournois);
    }
  }

  // Lien retour
  document.getElementById('back-to-event').href = `evenement.html?id=${eventId}`;
  renderTournament(tournoi, event);
});