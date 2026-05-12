fetch('data/exercises.json')
  .then(response => response.json())
  .then(exercises => {

    const container = document.getElementById('exercise-container');

    exercises.forEach(exercise => {

      const card = document.createElement('div');
      card.className = 'exercise-card';

      card.innerHTML = `
        <img src="${exercise.image}" alt="${exercise.nom}">
        
        <h2>${exercise.nom}</h2>

        <p>${exercise.objectif}</p>

        <button>Lancer</button>
      `;

      container.appendChild(card);

    });

  });