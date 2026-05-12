fetch('data/exercises.json')
  .then(response => response.json())
  .then(exercises => {

    const container = document.getElementById('exercise-container');

    exercises.forEach(exercise => {

      const tagsHTML = exercise.tags
        .map(tag => `<span>${tag}</span>`)
        .join('');

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

          <p class="duration">
            ${exercise.duree}
          </p>

          <div class="tags">
            ${tagsHTML}
          </div>

          <button>Lancer</button>

        </div>

      `;

      container.appendChild(card);

    });

  });