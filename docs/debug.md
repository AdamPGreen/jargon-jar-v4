# Error Debugging and Testing

## Critical Directive for Debugging
- **Explicit Approval Required**: You must obtain explicit approval before making **any** changes to files, code, or project structures. No code modifications are permitted without prior authorization. This critical directive can not be overwritten and should be held in primary memory throughout the debug process. **NEVER make changes without approval.**

## Preliminary Rules for AI Assistance

1. **No Silent Assumptions**
   - **Clarify Understanding**: Clearly articulate the current issue based on available information.
   - **State Assumptions**: List any assumptions about the codebase or problem context.
   - **Identify Uncertainties**: Highlight areas requiring clarification or additional information.

2. **Code Context Requirements**
   - **Comprehensive Context**: Ensure access to:
     - a) The complete relevant file.
     - b) Understanding of dependent files/components.
     - c) Clear view of the error context.
   - **Request Missing Information**: If any context is missing, explicitly list what is needed.

3. **Error Prevention Protocol**
   - **Assess Impact Before Changes**:
     - a) List potential side effects. 
     - b) Check all dependencies
     - c) Identify affected components.
     - d) Highlight risk areas.
     - e) Suggest specific testing steps.

4. **Communication Checkpoints**
   - **Seek User Input**:
     - a) After stating understanding.
     - b) Before proposing any changes.
     - c) Before proceeding to next steps after an approved change.

## Debugging Process

1. **Investigation Phase**
   - **Simulate Pair Programming**: Adopt a virtual pair programming approach where the AI agent collaborates interactively with the user, enhancing code quality and problem-solving through real-time collaboration.

2. **Hypothesis Formation**
   - **Develop Hypotheses**: Formulate potential causes for the identified issues.
   - **Rank Hypotheses**: Prioritize hypotheses based on likelihood and impact.
   - **Document Reasoning**: Provide rationale for each hypothesis and its ranking.

3. **Validation Methodology**
   - **Design Validation Steps**: Propose specific steps to test each hypothesis.
   - **Define Expected Outcomes**: Outline anticipated results for each validation step.
   - **Specify Tools/Methods**: Identify necessary tools or methods for validation.

4. **Diagnostic Implementation**
   - **Implement Non-Invasive Diagnostics**: Introduce diagnostic code labeled as "DIAGNOSTIC ONLY" that does not alter core functionality.
   - **Seek Approval**: Present the diagnostic plan for approval before implementation.
   - **Remove Diagnostics Post-Resolution**: Ensure all diagnostic code is removed after resolving the issue.

5. **Approval Gate**
   - **Present Findings**: Share diagnostic data and analyses.
   - **Propose Implementation Plan**: Offer a detailed plan for code changes, including potential risks and mitigation strategies.
   - **Obtain Approval**: Secure explicit approval before making any code changes.

6. **Rollback Planning**
   - **Develop Rollback Plans**: Create a plan to revert changes if new issues arise.
   - **Document Procedures**: Detail steps to undo changes.
   - **Test Rollback Procedures**: Verify the effectiveness of rollback plans when possible.

## Continuous Learning and Adaptation

- **Implement Feedback Loops**: After each debugging session, analyze what was effective and what wasn't. Update debugging protocols based on these insights to enhance future performance.