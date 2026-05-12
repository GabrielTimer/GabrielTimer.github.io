const VERSION = Date.now();

fetch('data/exercises.json?v=' + VERSION)
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
          <img src="${exercise.image.replace('exercises/','')}" alt="${exercise.nom}">
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

          <button class="launch-btn">
  Lancer
</button>

        </div>

      `;

      card.addEventListener('click', () => {
const launchBtn =
document.getElementById('modal-launch');

if(localStorage.getItem("return_to_config")){

  launchBtn.innerText =
  "Ajouter à ma séance";

}else{

  launchBtn.innerText =
  "Lancer l'exercice";

}
  document.getElementById('modal-image').src =
exercise.image.replace('exercises/','');

  document.getElementById('modal-title').innerText =
    exercise.nom;

  document.getElementById('modal-duration').innerText =
    exercise.duree;

  const consignesList =
    document.getElementById('modal-consignes');

  consignesList.innerHTML = '';

  exercise.consignes.forEach(consigne => {

    consignesList.innerHTML += `
      <li>${consigne}</li>
    `;

  });

  const precautionsList =
    document.getElementById('modal-precautions');

  precautionsList.innerHTML = '';

  exercise.precautions.forEach(precaution => {

    precautionsList.innerHTML += `
      <li>${precaution}</li>
    `;

  });

  document.getElementById('exercise-modal')
    .style.display = 'flex';
document.getElementById('modal-launch')
.onclick = () => {

  let fromConfig =
  localStorage.getItem("return_to_config");

  /* ===== AJOUT AU MODE LIBRE ===== */

  if(fromConfig){

    let current =
    JSON.parse(

      localStorage.getItem("programme_temp")

      ||

      '{"nom":"Libre","series":1,"exercices":[]}'

    );

    current.exercices.push({

      id: exercise.id,

      nom: exercise.nom,

      mode: exercise.mode || "respir",

      ex: 30,
      repos: 10,
      reps: 5,

      image:
exercise.image.replace('exercises/',''),

      conseil:
      exercise.objectif || ""

    });

    localStorage.setItem(

      "programme_temp",

      JSON.stringify(current)

    );

    localStorage.removeItem(
      "return_to_config"
    );

    window.location.href =
    "../config.html";

    return;

  }

  /* ===== LANCEMENT NORMAL ===== */

  if(exercise.mode === "respir"){

    window.location.href =
    `../respir/index.html?exercise=${exercise.id}`;

  }else{

    window.location.href =
    `../timer.html?exercise=${exercise.id}`;

  }

};

});

container.appendChild(card);

    });

  });
document.querySelector('.close-modal')
  .addEventListener('click', () => {

    document.getElementById('exercise-modal')
      .style.display = 'none';

});
window.addEventListener('click', (e) => {

  const modal =
    document.getElementById('exercise-modal');

  if(e.target === modal){

    modal.style.display = 'none';

  }

});