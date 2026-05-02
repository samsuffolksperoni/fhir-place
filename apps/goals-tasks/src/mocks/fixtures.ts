import type { Bundle, Goal, Patient, Resource, StructureDefinition, Task } from "fhir/r4";
import { DEMO_PATIENT_ID } from "../config.js";

const now = () => new Date().toISOString();

export const patientFixture: Patient = {
  resourceType: "Patient",
  id: DEMO_PATIENT_ID,
  meta: { versionId: "1", lastUpdated: "2024-10-01T12:00:00Z" },
  active: true,
  name: [{ use: "official", given: ["Priya"], family: "Shah" }],
  gender: "female",
  birthDate: "1974-03-18",
  text: {
    status: "generated",
    div: '<div xmlns="http://www.w3.org/1999/xhtml"><p>Priya Shah — 50yo, managing hypertension and pre-diabetes.</p></div>',
  },
};

/**
 * Three starter goals that a chronic-care team might work on for a patient
 * like Priya. Each has a description, lifecycleStatus, and subject Reference.
 */
export const initialGoals: Goal[] = [
  {
    resourceType: "Goal",
    id: "goal-bp",
    lifecycleStatus: "active",
    description: { text: "Systolic BP consistently below 130 mmHg" },
    subject: { reference: `Patient/${DEMO_PATIENT_ID}`, display: "Priya Shah" },
    target: [
      {
        measure: {
          coding: [
            { system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" },
          ],
        },
        detailRange: {
          low: { value: 110, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
          high: { value: 130, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
        },
        dueDate: "2025-06-30",
      },
    ],
    startDate: "2024-10-01",
  },
  {
    resourceType: "Goal",
    id: "goal-a1c",
    lifecycleStatus: "active",
    description: { text: "HbA1c below 6.5% within 6 months" },
    subject: { reference: `Patient/${DEMO_PATIENT_ID}`, display: "Priya Shah" },
    target: [
      {
        measure: {
          coding: [
            { system: "http://loinc.org", code: "4548-4", display: "HbA1c" },
          ],
        },
        detailQuantity: {
          value: 6.5,
          unit: "%",
          system: "http://unitsofmeasure.org",
          code: "%",
        },
        dueDate: "2025-04-30",
      },
    ],
    startDate: "2024-11-01",
  },
  {
    resourceType: "Goal",
    id: "goal-activity",
    lifecycleStatus: "planned",
    description: { text: "150 minutes of moderate activity per week" },
    subject: { reference: `Patient/${DEMO_PATIENT_ID}`, display: "Priya Shah" },
  },
];

export const initialTasks: Task[] = [
  {
    resourceType: "Task",
    id: "task-bp-log",
    status: "in-progress",
    intent: "plan",
    priority: "routine",
    description: "Record home BP twice daily and log in the patient portal",
    for: { reference: `Patient/${DEMO_PATIENT_ID}`, display: "Priya Shah" },
    focus: { reference: "Goal/goal-bp", display: "Systolic BP < 130" },
    authoredOn: "2024-10-02T09:00:00Z",
  },
  {
    resourceType: "Task",
    id: "task-bp-meds",
    status: "requested",
    intent: "order",
    priority: "routine",
    description: "Titrate lisinopril to 20mg daily; review at next visit",
    for: { reference: `Patient/${DEMO_PATIENT_ID}`, display: "Priya Shah" },
    focus: { reference: "Goal/goal-bp", display: "Systolic BP < 130" },
    authoredOn: "2024-10-02T09:15:00Z",
  },
  {
    resourceType: "Task",
    id: "task-a1c-draw",
    status: "completed",
    intent: "plan",
    priority: "routine",
    description: "Draw HbA1c baseline labs",
    for: { reference: `Patient/${DEMO_PATIENT_ID}`, display: "Priya Shah" },
    focus: { reference: "Goal/goal-a1c", display: "HbA1c < 6.5%" },
    authoredOn: "2024-11-01T08:00:00Z",
  },
  {
    resourceType: "Task",
    id: "task-diet-education",
    status: "ready",
    intent: "plan",
    priority: "routine",
    description: "Meet with dietician for carbohydrate-counting session",
    for: { reference: `Patient/${DEMO_PATIENT_ID}`, display: "Priya Shah" },
    focus: { reference: "Goal/goal-a1c", display: "HbA1c < 6.5%" },
    authoredOn: "2024-11-05T10:00:00Z",
  },
];

/* ---------- bundled StructureDefinitions ---------- */

/** Enough Goal elements to drive a meaningful edit form. */
export const goalStructureDefinition: StructureDefinition = {
  resourceType: "StructureDefinition",
  id: "Goal",
  url: "http://hl7.org/fhir/StructureDefinition/Goal",
  name: "Goal",
  status: "active",
  kind: "resource",
  abstract: false,
  type: "Goal",
  snapshot: {
    element: [
      { id: "Goal", path: "Goal", min: 0, max: "*", short: "Describes the intended objective(s) for a patient" },
      { id: "Goal.id", path: "Goal.id", min: 0, max: "1", type: [{ code: "id" }] },
      { id: "Goal.meta", path: "Goal.meta", min: 0, max: "1", type: [{ code: "Meta" }] },
      { id: "Goal.lifecycleStatus", path: "Goal.lifecycleStatus", min: 1, max: "1", short: "proposed | planned | accepted | active | on-hold | completed | cancelled | entered-in-error | rejected", type: [{ code: "code" }], binding: { strength: "required", valueSet: "http://hl7.org/fhir/ValueSet/goal-status" } },
      { id: "Goal.achievementStatus", path: "Goal.achievementStatus", min: 0, max: "1", short: "in-progress | improving | worsening | no-change | achieved | sustaining | not-achieved | no-progress | not-attainable", type: [{ code: "CodeableConcept" }] },
      { id: "Goal.priority", path: "Goal.priority", min: 0, max: "1", short: "high | medium | low", type: [{ code: "CodeableConcept" }] },
      { id: "Goal.description", path: "Goal.description", min: 1, max: "1", short: "Code or text describing goal", type: [{ code: "CodeableConcept" }] },
      { id: "Goal.subject", path: "Goal.subject", min: 1, max: "1", short: "Who this goal is intended for", type: [{ code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Patient"] }] },
      { id: "Goal.start[x]", path: "Goal.start[x]", min: 0, max: "1", short: "When goal pursuit begins", type: [{ code: "date" }, { code: "CodeableConcept" }] },
      { id: "Goal.target", path: "Goal.target", min: 0, max: "*", short: "Target outcome for the goal", type: [{ code: "BackboneElement" }] },
      { id: "Goal.target.measure", path: "Goal.target.measure", min: 0, max: "1", short: "The parameter whose value is being tracked", type: [{ code: "CodeableConcept" }] },
      { id: "Goal.target.detail[x]", path: "Goal.target.detail[x]", min: 0, max: "1", short: "The target value", type: [{ code: "Quantity" }, { code: "Range" }, { code: "CodeableConcept" }, { code: "string" }, { code: "boolean" }, { code: "integer" }, { code: "Ratio" }] },
      { id: "Goal.target.due[x]", path: "Goal.target.due[x]", min: 0, max: "1", short: "Reach goal on or before", type: [{ code: "date" }, { code: "Duration" }] },
      { id: "Goal.statusDate", path: "Goal.statusDate", min: 0, max: "1", short: "When goal status took effect", type: [{ code: "date" }] },
      { id: "Goal.note", path: "Goal.note", min: 0, max: "*", short: "Comments about the goal", type: [{ code: "Annotation" }] },
    ],
  },
};

/** Enough Task elements to drive a meaningful edit form. */
export const taskStructureDefinition: StructureDefinition = {
  resourceType: "StructureDefinition",
  id: "Task",
  url: "http://hl7.org/fhir/StructureDefinition/Task",
  name: "Task",
  status: "active",
  kind: "resource",
  abstract: false,
  type: "Task",
  snapshot: {
    element: [
      { id: "Task", path: "Task", min: 0, max: "*", short: "A task to be performed" },
      { id: "Task.id", path: "Task.id", min: 0, max: "1", type: [{ code: "id" }] },
      { id: "Task.meta", path: "Task.meta", min: 0, max: "1", type: [{ code: "Meta" }] },
      { id: "Task.status", path: "Task.status", min: 1, max: "1", short: "draft | requested | received | accepted | rejected | ready | cancelled | in-progress | on-hold | failed | completed | entered-in-error", type: [{ code: "code" }], binding: { strength: "required", valueSet: "http://hl7.org/fhir/ValueSet/task-status" } },
      { id: "Task.intent", path: "Task.intent", min: 1, max: "1", short: "unknown | proposal | plan | order | original-order | reflex-order | filler-order | instance-order | option", type: [{ code: "code" }] },
      { id: "Task.priority", path: "Task.priority", min: 0, max: "1", short: "routine | urgent | asap | stat", type: [{ code: "code" }] },
      { id: "Task.description", path: "Task.description", min: 0, max: "1", short: "Human-readable explanation of task", type: [{ code: "string" }] },
      { id: "Task.focus", path: "Task.focus", min: 0, max: "1", short: "What task is acting on", type: [{ code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Goal"] }] },
      { id: "Task.for", path: "Task.for", min: 0, max: "1", short: "Beneficiary of the Task", type: [{ code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Patient"] }] },
      { id: "Task.authoredOn", path: "Task.authoredOn", min: 0, max: "1", short: "Task creation date", type: [{ code: "dateTime" }] },
      { id: "Task.lastModified", path: "Task.lastModified", min: 0, max: "1", short: "Task last modified", type: [{ code: "dateTime" }] },
      { id: "Task.owner", path: "Task.owner", min: 0, max: "1", short: "Responsible individual / team", type: [{ code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Practitioner", "http://hl7.org/fhir/StructureDefinition/Organization"] }] },
      { id: "Task.note", path: "Task.note", min: 0, max: "*", short: "Comments made about the task", type: [{ code: "Annotation" }] },
    ],
  },
};

export const goalStatusValueSet = {
  resourceType: "ValueSet",
  status: "active",
  url: "http://hl7.org/fhir/ValueSet/goal-status",
  expansion: {
    identifier: "x",
    timestamp: now(),
    contains: [
      "proposed",
      "planned",
      "accepted",
      "active",
      "on-hold",
      "completed",
      "cancelled",
      "entered-in-error",
      "rejected",
    ].map((code) => ({ system: "http://hl7.org/fhir/goal-status", code, display: code })),
  },
};

export const taskStatusValueSet = {
  resourceType: "ValueSet",
  status: "active",
  url: "http://hl7.org/fhir/ValueSet/task-status",
  expansion: {
    identifier: "x",
    timestamp: now(),
    contains: [
      "draft",
      "requested",
      "received",
      "accepted",
      "rejected",
      "ready",
      "cancelled",
      "in-progress",
      "on-hold",
      "failed",
      "completed",
      "entered-in-error",
    ].map((code) => ({ system: "http://hl7.org/fhir/task-status", code, display: code })),
  },
};

export const searchBundle = <T extends Resource>(resources: T[]): Bundle<T> => ({
  resourceType: "Bundle",
  type: "searchset",
  total: resources.length,
  entry: resources.map((r) => ({ resource: r, fullUrl: `${r.resourceType}/${r.id}` })),
});
