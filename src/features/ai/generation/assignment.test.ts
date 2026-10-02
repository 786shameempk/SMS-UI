import { homeworkToAssignmentText, worksheetToAssignmentText } from "./assignment";

describe("assignment text", () => {
  it("lists homework tasks with time estimates and the optional extra tasks", () => {
    const text = homeworkToAssignmentText({
      title: "Fractions practice",
      instructions: "Show your working.",
      tasks: [
        { description: "Add 1/2 and 1/3.", difficulty: "Easy", estimatedMinutes: 5, learningObjective: "Add fractions" },
        { description: "Word problem about pizza.", difficulty: "Medium", estimatedMinutes: 10, learningObjective: "Apply" },
      ],
      extensionTask: "Make your own problem.",
      supportTask: "",
    });

    expect(text).toBe("Show your working.\n\n1. Add 1/2 and 1/3. (about 5 min)\n2. Word problem about pizza. (about 10 min)\n\nChallenge: Make your own problem.");
  });

  it("numbers worksheet items across sections and never includes answers", () => {
    const text = worksheetToAssignmentText({
      title: "Tenses",
      sections: [
        { kind: "MCQ", instructions: "Choose one.", items: [{ prompt: "She ___ to school.", options: ["go", "goes"], answer: "goes", marks: 1 }] },
        { kind: "FillInBlank", instructions: "Fill in.", items: [{ prompt: "They ___ (play) yesterday.", options: [], answer: "played", marks: 1 }] },
      ],
    });

    expect(text).toBe("MCQ: Choose one.\n1. She ___ to school. (go / goes)\n\nFillInBlank: Fill in.\n2. They ___ (play) yesterday.");
    expect(text).not.toMatch(/played|answer/i);
  });
});
