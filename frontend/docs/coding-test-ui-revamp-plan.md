# Coding Test Page UI Revamp Plan

This plan outlines the steps to overhaul the UI/UX of the coding test solving page (`frontend/src/app/coding-test/solve/page.tsx`) based on the requirements.

**Goal:** Transform the current coding test page into a professional, feature-rich interface resembling modern coding platforms, including collapsible sidebars, a results panel, and UI placeholders for future backend integration (code execution, submission, chatbot).

**Proposed Layout Structure:**

We'll adopt a multi-panel layout:

1. **Header:** Remains mostly the same, but will include the Theme Toggle.
2. **Main Content Area:** This will be the core interactive area, divided into:
   - **Left Sidebar (Collapsible):** Contains controls to toggle the visibility of the main Problem Description panel. Inspired by VSCode's activity bar.
   - **Central Panel (Resizable):** This area itself will contain:
     - **Problem Description Panel (Toggleable):** Displays the problem details. Its visibility is controlled by the Left Sidebar. Occupies the full width of the Central Panel when the Editor is hidden (or potentially side-by-side if desired, though toggle is simpler initially).
     - **Editor &amp; Results Panel (Vertically Resizable):** Contains the Code Editor and the Results Panel below it. This combined panel takes the space when the Problem Description is visible.
       - **Code Editor Panel:** Houses the Monaco editor and controls (Language, Reset, Run, Submit).
       - **Results Panel (Resizable/Collapsible):** Sits below the editor, with tabs for "Example Tests", "Custom Input", and "Submission Results".
   - **Right Sidebar (Collapsible):** Contains the placeholder UI for the LLM Chatbot.
3. **Footer:** Remains the same.

**Mermaid Diagram of Layout:**

```mermaid
graph TD
    A[CodingTestSolvePage] --> B(Header - ThemeToggle);
    A --> C(MainContentArea);
    A --> D(Footer);

    subgraph MainContentArea
        direction LR
        E(LeftSidebar - Collapsible) -- Controls Visibility --> G;
        E -- Contains --> E_Icons[Problem Icon, etc.];
        F[CentralPanel - Resizable Horizontally];
        I(RightSidebar - Collapsible) -- Contains --> J[ChatbotUI - Placeholder];
        E <--> F;
        F <--> I;
    end

    subgraph CentralPanel
        direction TB
        G[ProblemDescriptionPanel - Toggleable];
        H[EditorAndResultsPanel - Vertical Split / Resizable];
        G <- Optional Split / Toggle -> H; %% G and H might be side-by-side or toggled
    end


    subgraph EditorAndResultsPanel
        direction TB
        K(EditorPanel - Resizable) -- Contains --> L[CodeEditor];
        K -- Contains --> M[EditorControls - LangSelect, Reset, Run, Submit];
        K -- Resizable --> N(ResultsPanel - Resizable/Collapsible);
    end

    subgraph ResultsPanel
        direction LR
        O{Tabs} --> P[ExampleTests];
        O --> Q[CustomInput];
        O --> R[SubmissionResult - Placeholder];
    end

    style E fill:#f9f,stroke:#333,stroke-width:2px
    style I fill:#ccf,stroke:#333,stroke-width:2px
    style G fill:#eee,stroke:#333,stroke-width:1px
    style K fill:#def,stroke:#333,stroke-width:1px
    style N fill:#fde,stroke:#333,stroke-width:1px
    style J fill:#eef,stroke:#333,stroke-width:1px
```

**Detailed Plan &amp; Checklist (Markdown):**

- **Phase 1: Structure and Layout**

  - [*] **Refactor `CodingTestSolvePage`:** Break down `CodingTestContent` into smaller components (e.g., `LeftSidebar`, `CentralPanel`, `RightSidebar`, `EditorPanel`, `ResultsPanel`, `ProblemPanel`, `ChatbotPanel`). Manage state (Zustand/Context).
  - [*] **Implement Main Layout:** Use `react-resizable-panels` or similar for Left Sidebar, Central Panel, Right Sidebar resizing.
  - [*] **Implement Left Sidebar:** Collapsible, icons/buttons to control `CentralPanel` views.
  - [*] **Implement Right Sidebar:** Collapsible, placeholder UI for `ChatbotPanel`.
  - [*] **Implement `CentralPanel` Structure:** Define `ProblemPanel` / `EditorAndResultsPanel` layout (toggle/split). Implement vertical resizing between `EditorPanel` and `ResultsPanel`.
  - [*] **Implement `ProblemPanel`:** Display details, scrollable, link visibility to Left Sidebar.
  - [*] **Implement `EditorPanel`:** Integrate `CodeEditor`, make height flexible, add controls area (Language, Reset, Run, Submit).
  - [*] **Implement `ResultsPanel`:** Resizable/collapsible, Tab structure ("Example Test Cases", "Custom Input", "Submission Result").

- **Phase 2: Feature Implementation (UI Focus)**

  - [*] **Example Test Cases Tab:** Display `problemDetails.examples` clearly.
  - [*] **Custom Input Tab:** Textarea for input, placeholder output area, connect "Run" button UI state.
  - [*] **Submission Result Tab:** Placeholder UI for results table, connect "Submit" button UI state.
  - [*] **Code Reset Functionality:** Implement "Reset Code" button logic using `CODE_TEMPLATES`.
  - [*] **Theme Selection:** Add toggle in `Header`, implement Tailwind/CSS var switching, update Monaco theme.

- **Phase 3: Styling and Refinement**

  - [*] **Apply Professional Styling:** Consistent Tailwind CSS, VSCode-inspired look.
  - [*] **Improve Responsiveness:** Basic handling for smaller screens.
  - [*] **Refine Interactions:** Smooth transitions, clear feedback on resize/hover/active states.
  - [*] **Accessibility:** Basic ARIA attributes.

- **Future Work (Requires Backend API)**
  - [ ] Connect "Run" button to `runCode` API.
  - [ ] Connect "Submit" button to `submitCode` API.
  - [ ] Fetch/display results via `getSubmissionResult` API.
  - [ ] Implement Chatbot backend and connect UI.
