const VERSION = Date.now();

fetch('/data/exercises.json?v=' + VERSION)
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
exercise.image;
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

      mode: "timer",

      ex: 30,
      repos: 10,
      reps: 5,

      image: exercise.image,

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

    localStorage.setItem(
"programme_temp",
JSON.stringify({
nom:"Libre",
series:1,
exercices:[{
id: exercise.id,
nom: exercise.nom,
mode:"timer",
ex:30,
repos:10,
reps:5,
image: exercise.image,
conseil: exercise.objectif || ""
}]
})
);

window.location.href = "../timer.html";
    return;

  }

 /* ===== AJOUT AU MODE LIBRE ===== */
localStorage.setItem(
"programme_temp",
JSON.stringify({
nom:"Libre",
series:1,
exercices:[{
id: exercise.id,
nom: exercise.nom,
mode:"timer",
ex:30,
repos:10,
reps:5,
image: exercise.image,
conseil: exercise.objectif || ""
}]
})
);

window.location.href = "../timer.html";
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