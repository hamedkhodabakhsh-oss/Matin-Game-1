import { PRESETS } from "./presets.js";

const KEY = "car_garage_v1";
const garageEl = document.getElementById("garage");

function loadGarage() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

function saveGarage(cars) {
  localStorage.setItem(KEY, JSON.stringify(cars));
}

function openBuilder(car) {
  sessionStorage.setItem("builder_load", JSON.stringify(car));
  location.href = "builder.html";
}

function render() {
  const cars = loadGarage();
  garageEl.innerHTML = "";

  if (cars.length === 0) {
    garageEl.innerHTML = `
      <div class="card">
        Your garage is empty.
        <button onclick="location.href='builder.html'">Create Custom Car</button>
      </div>
    `;
  }

  for (const car of cars) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${car.brand} ${car.model}</strong><br/>
      ${car.bodyType} • ${car.length}mm
      <button>Edit / Export</button>
    `;
    div.querySelector("button").onclick = () => openBuilder(car);
    garageEl.appendChild(div);
  }

  const presetsCard = document.createElement("div");
  presetsCard.className = "card";
  presetsCard.innerHTML = `<strong>Presets</strong>`;
  PRESETS.forEach(p => {
    const b = document.createElement("button");
    b.textContent = `${p.brand} ${p.model}`;
    b.onclick = () => openBuilder(p);
    presetsCard.appendChild(b);
  });
  garageEl.appendChild(presetsCard);
}

render();