# 0001 — Identity refresh uses hybrid auto-write with ratcheting confidence threshold

When the GitHub webhook or a workflow run needs to update a portfolio identity facet, the
`refreshIdentityWorkflow` ends with a hybrid policy: most writes are applied directly via
`identityRepository.writeFacet(...)` (with `source='github'`), but writes the diff step is
uncertain about are held back as proposals in `portfolio_identity_proposals` instead. The
threshold starts at "auto-write everything" and ratchets up over time as false positives
accumulate. This keeps the agent visibly doing its job (no daily approval ritual) while
preserving a single-knob safety valve for when the LLM is wrong.
