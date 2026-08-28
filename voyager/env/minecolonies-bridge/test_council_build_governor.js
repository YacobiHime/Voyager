const assert = require("assert");
const { buildCandidates } = require("./council.js");

function colony(buildings) {
  return [{
    id: 1,
    citizens: [],
    buildings,
    researchUnlocked: [],
  }];
}

function building(overrides) {
  return {
    x: 0, y: 64, z: 0,
    type: "blockhutcitizen",
    level: 0,
    maxLevel: 5,
    pending: false,
    operational: false,
    inTerritory: true,
    workers: [],
    ...overrides,
  };
}

function actionsFor(buildings) {
  return buildCandidates(colony(buildings)).map((candidate) => candidate.action);
}

{
  const actions = actionsFor([
    building({ type: "blockhutbuilder", level: 1, operational: true }),
    building({ x: 20, type: "blockhutcitizen" }),
  ]);
  assert(actions.some((action) => action.action === "requestBuild" && action.x === 20));
  assert(!actions.some((action) => action.action === "placeNext"));
}

{
  const actions = actionsFor([
    building({ type: "blockhutbuilder", level: 1, operational: true }),
    building({ x: 101, type: "blockhutcitizen" }),
  ]);
  assert(!actions.some((action) => action.action === "requestBuild" && action.x === 101));
}

{
  const actions = actionsFor([
    building({ type: "blockhutbuilder", level: 1, operational: true }),
    building({ x: 100, type: "blockhutcitizen" }),
  ]);
  assert(actions.some((action) => action.action === "requestBuild" && action.x === 100));
}

{
  const actions = actionsFor([
    building({ x: 101, type: "blockhutcitizen" }),
  ]);
  assert(actions.some((action) => action.action === "requestBuild" && action.x === 101));
}

console.log("ALL PASS (council build governor)");
