const VERSION = Date.now();

fetch('/exercises/data/exercises.json?v=' + VERSION)
  .then(response => response.json())
  .then(exercises => {

    const container =
    document.getElementById('exercise-container');

    exercises.forEach(exercise => {

      const tagsHTML = (exercise.tags || [])
        .map(tag => `<span>${tag}</span>`)
        .join('');

      const card = document.createElement('div');

      card.className = 'exercise-card';

      card.innerHTML = `

        <div class="image-wrapper">
          <img src="${exercise.image}" alt="${exercise.nom}">

          <div class="level-badge">
            Niveau ${exercise.niveau || 1}
          </div>
        </div>

        <div class="card-content">

          <div class="category">
            ${exercise.categorie || ""}
          </div>

          <h2>${exercise.nom}</h2>

          <p class="objective">
            ${exercise.objectif || ""}
          </p>

          <p class="duration">
            ${exercise.duree || ""}
          </p>

          <div class="tags">
            ${tagsHTML}
          </div>

          <button class="launch-btn">
            Ajouter à ma séance
          </button>

        </div>

      `;

     const addButton =
card.querySelector('.launch-btn');

addButton.addEventListener('click', (e) => {

  e.stopPropagation();

  let current =
  JSON.parse(
    localStorage.getItem("programme_temp")
    ||
    '{"nom":"Libre","series":1,"exercices":[]}'
  );

  current.exercices.push({

    id: exercise.id,

    nom: exercise.nom,

    type: "timer",

    image: exercise.image,

    conseil:
    (exercise.consignes || []).join("<br>"),

    ex:
    exercise.timer_config?.phase_monte || 30,

    repos:
    exercise.timer_config?.phase_descente || 10,

    reps:
    exercise.timer_config?.cycles || 5

  });

  localStorage.setItem(
    "programme_temp",
    JSON.stringify(current)
  );

  window.location.href =
  "../config.html";

});
      container.appendChild(card);

    });

  });
