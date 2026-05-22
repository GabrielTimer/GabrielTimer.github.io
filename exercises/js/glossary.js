const VERSION = Date.now();

const filters = {
  search: '',
  categorie: [],
  niveau: [],
  tags: []
};

let exercises = [];

fetch('./data/exercises.json?v=' + VERSION)

.then(response => response.json())

.then(data => {

  console.log("EXERCISES LOADED", data);

  exercises = data;

  buildFilters();

  setupSearch();

  setupReset();

  updateGlossary();

})

.catch(error => {

  console.error("ERREUR FETCH JSON", error);

});


function buildFilters(){

  const container =
  document.getElementById('filters');

  container.innerHTML = '';

  createFilterGroup(
    'categorie',
    'Catégories'
  );

  createFilterGroup(
    'niveau',
    'Niveaux'
  );

  createFilterGroup(
    'tags',
    'Tags'
  );
}

function createFilterGroup(field, title){

  const container =
  document.getElementById('filters');

  const values =
  getUniqueValues(field);

  const group =
  document.createElement('div');

  group.className =
  'filter-group';

  group.innerHTML = `

    <button class="dropdown-toggle">

      ${title}

      <span>▼</span>

    </button>

    <div class="dropdown-panel">

      <div class="filter-buttons">

      </div>

    </div>

  `;

  const toggle =
  group.querySelector('.dropdown-toggle');

  const panel =
  group.querySelector('.dropdown-panel');

  toggle.addEventListener('click', () => {

    panel.classList.toggle('open');

  });

  const buttonsContainer =
  group.querySelector('.filter-buttons');

  values.forEach(value => {

    const btn =
    document.createElement('button');

    btn.className =
    'filter-chip';

    btn.dataset.field =
    field;

    btn.dataset.value =
    value;

    btn.innerHTML =
    `${value} <span>(0)</span>`;

    btn.addEventListener('click', () => {

      toggleFilter(field, value);

    });

    buttonsContainer.appendChild(btn);

  });

  container.appendChild(group);
}

function getUniqueValues(field){

  const values = [];

  exercises.forEach(ex => {

    const value = ex[field];

    if(value === undefined || value === null)
      return;

    if(Array.isArray(value)){

      value.forEach(v => {

        values.push(String(v));

      });

    } else {

      values.push(String(value));

    }

  });

  return [...new Set(values)].sort();
}

function toggleFilter(field, value){

  const array = filters[field];

  const index =
  array.indexOf(value);

  if(index === -1){

    array.push(value);

  } else {

    array.splice(index, 1);

  }

  updateGlossary();
}

function setupSearch(){

  document
  .getElementById('searchInput')

  .addEventListener('input', e => {

    filters.search =
    e.target.value.toLowerCase();

    updateGlossary();

  });
}

function setupReset(){

  document
  .getElementById('resetFilters')

  .addEventListener('click', () => {

    filters.search = '';

    filters.categorie = [];
    filters.niveau = [];
    filters.tags = [];

    document
    .getElementById('searchInput')
    .value = '';

    updateGlossary();

  });
}

function updateGlossary(){

  const filtered =
  filterExercises();

  renderExercises(filtered);

  updateButtons(filtered);

  updateActiveFilters();

  updateResultsCount(filtered);
}

function filterExercises(){

  return exercises.filter(ex => {

    const searchText = [

      ex.nom,

      ex.objectif,

      ...(ex.tags || [])

    ]

    .join(' ')
    .toLowerCase();

    if(
      filters.search &&
      !searchText.includes(filters.search)
    ){
      return false;
    }

    if(
      filters.categorie.length &&
      !filters.categorie.includes(
        ex.categorie
      )
    ){
      return false;
    }

    if(
      filters.niveau.length &&
!filters.niveau.includes(
  String(ex.niveau)
)
    ){
      return false;
    }

    if(
      filters.tags.length &&
      !filters.tags.some(tag =>
        (ex.tags || []).includes(tag)
      )
    ){
      return false;
    }

    return true;

  });
}

function renderExercises(list){

  const container =
  document.getElementById(
    'exercise-container'
  );

  container.innerHTML = '';

  list.forEach(exercise => {

    const tagsHTML =
    (exercise.tags || [])

    .map(tag =>
      `<span>${tag}</span>`
    )

    .join('');

    const card =
    document.createElement('div');

    card.className =
    'exercise-card';

    card.innerHTML = `

      <div class="image-wrapper">

        <img
          src="${exercise.image}"
          alt="${exercise.nom}"
        >

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

    addButton.addEventListener(
      'click',
      (e) => {

      e.stopPropagation();

      let current =
      JSON.parse(

        localStorage.getItem(
          "programme_temp"
        )

        ||

        '{"nom":"Libre","series":1,"exercices":[]}'

      );

      current.exercices.push({

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
}

function updateButtons(filtered){

  document
  .querySelectorAll('.filter-chip')

  .forEach(btn => {

    const field =
    btn.dataset.field;

    const value =
    btn.dataset.value;

    const count =
    filtered.filter(ex => {

      const data = ex[field];

      if(Array.isArray(data)){

        return data.includes(value);

      }

      return data == value;

    }).length;

    btn.querySelector('span')
    .textContent =
    `(${count})`;

    btn.classList.toggle(
      'active',
      filters[field].includes(value)
    );

    btn.classList.toggle(
      'disabled',
      count === 0
    );
  });
}

function updateActiveFilters(){

  const container =
  document.getElementById(
    'activeFilters'
  );

  container.innerHTML = '';

  Object.entries(filters)

  .forEach(([field, values]) => {

    if(!Array.isArray(values))
      return;

    values.forEach(value => {

      const chip =
      document.createElement('button');

      chip.className =
      'active-chip';

      chip.textContent =
      `${value} ×`;

      chip.onclick = () => {

        toggleFilter(field, value);

      };

      container.appendChild(chip);

    });

  });
}

function updateResultsCount(filtered){

  document
  .getElementById('resultsCount')

  .textContent =

  `${filtered.length} exercices`;
}