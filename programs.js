const VERSION = Date.now();

let programs = [];
let exercises = [];

Promise.all([

  fetch('./exercises/data/program_templates.json?v=' + VERSION)
  .then(r => r.json()),

  fetch('./exercises/data/exercises.json?v=' + VERSION)
  .then(r => r.json())

])

.then(([programData, exerciseData]) => {

  programs =
programData.programs || programData;

  exercises = exerciseData;

  renderPrograms();

});

function renderPrograms(){

  const container =
  document.getElementById(
    'programs-container'
  );

  container.innerHTML = '';

  programs.forEach(program => {

    const card =
    document.createElement('div');

    card.className =
    'program-card';

    const tagsHTML =
    (program.objectifs || [])

    .map(tag =>
      `<span>${tag}</span>`
    )

    .join('');

    card.innerHTML = `

      <h2>${program.nom}</h2>

      <p>
        ${program.description || ''}
      </p>

      <div class="program-tags">
        ${tagsHTML}
      </div>

    `;

    card.addEventListener('click', () => {

      generateProgram(program);

    });

    container.appendChild(card);

  });
}

function generateProgram(program){

const selectedExercises =

  (program.exercices || program.exercises || [])

  .map(id =>

    exercises.find(ex => ex.id === id)

  )

  .filter(Boolean);

  const newProgram = {

    nom: program.nom,

    series: 1,

    exercices: selectedExercises.map(exercise => ({

      id: exercise.id,

      nom: exercise.nom,

      type: "timer",

      image: exercise.image,

      conseil:
      (exercise.consignes || [])
      .join("<br>"),

      conseil_posture:
      exercise.conseil_posture || [],

      erreurs_frequentes:
      exercise.erreurs_frequentes || [],

      respiration:
      exercise.respiration || [],

      version_facile:
      exercise.version_facile || [],

      version_avancee:
      exercise.version_avancee || [],

      videos:
      exercise.videos || [],

      ex:
      exercise.timer_config
      ?.phase_monte || 30,

      repos:
      exercise.timer_config
      ?.phase_descente || 10,

      reps:
      exercise.timer_config
      ?.cycles || 5

    }))

  };

  localStorage.setItem(

    "programme_temp",

    JSON.stringify(newProgram)

  );

  window.location.href =
  "config.html";
}