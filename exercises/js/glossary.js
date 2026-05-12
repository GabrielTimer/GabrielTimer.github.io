fetch('data/exercises.json')
  .then(response => response.json())
  .then(exercises => {

    const container = document.getElementById('exercise-container');

    exercises.forEach(exercise => {

      const card = document.createElement('div');
      card.className = 'exercise-card';

      card.innerHTML = `
        
        <div class="image-wrapper">
          <img src="${exercise.image}" alt="${exercise.nom}">
          
          <div class="level-badge">
            Niveau ${exercise.niveau}
          </div>
        </div>

        <div class="card-content">

          <div class="category">
            ${exercise.categorie}
          </div>

          <h2>${exercise.nom}</h2>

          <p class="objective">
            ${exercise.objectif}
          </p>

          <div class="tags">
            <span>Senior</span>
            <span>Assis</span>
            <span>Posture</span>
          </div>

          <button>Lancer</button>

        </div>

      `;

      container.appendChild(card);

    });

  });