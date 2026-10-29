// Curated HCI findings. NOT an automatic UI compliance score.
// Each signal is a specific, externally established observation, not a regex guess.
// A finding is applicable only when the agent supplies evidence for that signal.
// Provenance is a research-study/standard/guideline/heuristic, not a universal design law.
export const HCI_FINDINGS = Object.freeze([
  {
    "id": "undersized-pointer-target",
    "domain": "motor",
    "title": "Pointer targets below minimum size without an applicable exception",
    "signal": "potentialUndersizedTarget",
    "kind": "standard-guided",
    "source": {
      "title": "WCAG 2.2",
      "url": "https://www.w3.org/TR/WCAG22/",
      "type": "standard"
    },
    "action": "Inspect the rendered hit area and spacing; enlarge or separate the target, or document the applicable WCAG exception.",
    "verify": "Rendered bounding boxes and adjacent targets; verify WCAG 2.5.8 exceptions.",
    "limits": "24 CSS px is a WCAG 2.2 AA minimum with exceptions, not a universal 44 px mandate.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "fragile-pointer-corridor",
    "domain": "motor",
    "title": "Narrow pointer path to submenu",
    "signal": "narrowSubmenuCorridor",
    "kind": "recommendation",
    "source": {
      "title": "Accot & Zhai (1997): Beyond Fitts' Law",
      "url": "https://chi1997.acm.org/proceedings/paper/ja.html",
      "type": "empirical"
    },
    "action": "Add pointer-safe hit regions, delay, or an alternative activation path; test diagonal movement.",
    "verify": "Playwright pointer traces on submenu traversal at different speeds.",
    "limits": "Steering law predicts movement difficulty; it does not prescribe a universal corridor width.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "drag-only-action",
    "domain": "motor",
    "title": "Drag is the sole pointer interaction",
    "signal": "dragWithoutPointerAlternative",
    "kind": "standard-guided",
    "source": {
      "title": "What's New in WCAG 2.2",
      "url": "https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/",
      "type": "standard"
    },
    "action": "Offer a single-pointer alternative such as move buttons or choose-destination.",
    "verify": "Complete the same task using clicks/taps without dragging.",
    "limits": "WCAG 2.5.7 has essential-function and user-agent exceptions.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "focus-hidden-by-overlay",
    "domain": "motor",
    "title": "Focused control entirely hidden by author content",
    "signal": "focusedControlFullyObscured",
    "kind": "standard-guided",
    "source": {
      "title": "WCAG 2.2: Focus Not Obscured",
      "url": "https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum",
      "type": "standard"
    },
    "action": "Adjust sticky layers or scroll behavior so keyboard focus remains visible.",
    "verify": "Tab through controls and check occlusion with overlays open.",
    "limits": "Partial occlusion can pass WCAG 2.4.11 AA; full visibility is still preferable.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "modal-focus-escape",
    "domain": "motor",
    "title": "Keyboard focus escapes an active modal",
    "signal": "modalFocusEscapes",
    "kind": "recommendation",
    "source": {
      "title": "WAI ARIA APG: Modal Dialog Pattern",
      "url": "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/",
      "type": "guideline"
    },
    "action": "Contain Tab and Shift+Tab within the modal and restore focus appropriately on close.",
    "verify": "Keyboard test the dialog including opening, cycling, Escape, and closing.",
    "limits": "Only applies to actual modal dialogs; non-modal dialogs have different behavior.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "silent-action-result",
    "domain": "feedback",
    "title": "User action changes state without perceivable acknowledgment",
    "signal": "actionResultNotPerceivable",
    "kind": "recommendation",
    "source": {
      "title": "Nielsen's 10 Usability Heuristics",
      "url": "https://www.nngroup.com/articles/ten-usability-heuristics/",
      "type": "heuristic"
    },
    "action": "Provide immediate and perceivable state feedback near the acted-on object.",
    "verify": "Task test whether users can identify the resulting state without searching.",
    "limits": "Action feedback need not be animation; text, state, and placement may suffice.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "silent-async-status",
    "domain": "feedback",
    "title": "Dynamic status is not programmatically exposed",
    "signal": "asyncStatusNotAnnounced",
    "kind": "standard-guided",
    "source": {
      "title": "WCAG: Status Messages",
      "url": "https://www.w3.org/WAI/WCAG21/Understanding/status-messages",
      "type": "standard"
    },
    "action": "Expose appropriate status semantics (e.g. role=status or live region) without stealing focus.",
    "verify": "Use a screen reader or inspect accessibility tree during asynchronous updates.",
    "limits": "Only actual status messages fall under SC 4.1.3; not every DOM update does.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "long-wait-without-progress",
    "domain": "feedback",
    "title": "Long-running operation gives no progress or acknowledgment",
    "signal": "slowTaskWithoutFeedback",
    "kind": "recommendation",
    "source": {
      "title": "Nielsen: Response Time Limits",
      "url": "https://www.nngroup.com/articles/response-times-3-important-limits/",
      "type": "guideline"
    },
    "action": "Acknowledge the action immediately; show status or progress as time grows.",
    "verify": "Measure action-to-feedback latency and user ability to tell whether the process is active.",
    "limits": "Response-time figures are heuristics, not guaranteed thresholds for every task.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "irreversible-destructive-action",
    "domain": "feedback",
    "title": "Destructive action lacks undo or adequate safeguard",
    "signal": "destructiveActionWithoutRecovery",
    "kind": "recommendation",
    "source": {
      "title": "Shneiderman (1982): Direct Manipulation",
      "url": "https://doi.org/10.1080/01449298208914450",
      "type": "research"
    },
    "action": "Prefer undo where feasible, otherwise use confirmation proportional to consequence.",
    "verify": "Complete a destructive task and test recovery or pre-action safeguards.",
    "limits": "Not every destructive action needs a dialog; undo can be superior.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "unhelpful-error-message",
    "domain": "feedback",
    "title": "Error is opaque or offers no recovery path",
    "signal": "errorWithoutRecoveryGuidance",
    "kind": "recommendation",
    "source": {
      "title": "Nielsen's 10 Usability Heuristics",
      "url": "https://www.nngroup.com/articles/ten-usability-heuristics/",
      "type": "heuristic"
    },
    "action": "Explain what failed and what the user can do next in plain language.",
    "verify": "Introduce predictable errors and evaluate resolution without outside help.",
    "limits": "Requires task interpretation, not keyword checks for 'error'.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "repeat-user-input",
    "domain": "feedback",
    "title": "Previously supplied data must be re-entered unnecessarily",
    "signal": "redundantDataEntry",
    "kind": "standard-guided",
    "source": {
      "title": "What's New in WCAG 2.2",
      "url": "https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/",
      "type": "standard"
    },
    "action": "Preserve prior inputs or offer a way to select them again within the same process.",
    "verify": "Walk the complete form flow with repeat values.",
    "limits": "WCAG 3.3.7 includes security, validity, and essential-entry exceptions.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "primary-action-buried",
    "domain": "cognition",
    "title": "Frequently used action is hidden behind advanced controls",
    "signal": "frequentActionHidden",
    "kind": "recommendation",
    "source": {
      "title": "NN/g: Progressive Disclosure",
      "url": "https://www.nngroup.com/articles/progressive-disclosure/",
      "type": "guideline"
    },
    "action": "Keep frequently needed actions in the initial layer; reserve disclosure for infrequent controls.",
    "verify": "Validate with task-frequency evidence and time-to-action measurements.",
    "limits": "Frequency must come from real tasks or observed usage, not the agent's taste.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "overnested-disclosure",
    "domain": "cognition",
    "title": "Advanced functions are nested behind three or more disclosure levels",
    "signal": "deepDisclosure",
    "kind": "recommendation",
    "source": {
      "title": "NN/g: Progressive Disclosure",
      "url": "https://www.nngroup.com/articles/progressive-disclosure/",
      "type": "guideline"
    },
    "action": "Flatten or regroup the disclosure structure where this makes users' paths clearer.",
    "verify": "Count disclosure levels and test common expert tasks.",
    "limits": "This is a guideline, not a guaranteed failure or hard prohibition.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "high-task-operation-cost",
    "domain": "cognition",
    "title": "Common task requires excessive repeated operations",
    "signal": "costlyFrequentTask",
    "kind": "recommendation",
    "source": {
      "title": "Card, Moran & Newell (1980): Keystroke-Level Model",
      "url": "https://iihm.imag.fr/blanch/ens/2010-2011/M1/EIHM/cours/1980-Card-KLM.pdf",
      "type": "empirical"
    },
    "action": "Compare alternative flows using task-step counts or a calibrated KLM model.",
    "verify": "Record actual expert workflows and compare completion time and errors.",
    "limits": "KLM is strongest for practiced tasks; novices require additional evaluation.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "ambiguous-group-structure",
    "domain": "perception",
    "title": "Visual grouping conflicts with semantic grouping",
    "signal": "misleadingVisualGrouping",
    "kind": "recommendation",
    "source": {
      "title": "Wagemans et al. (2012): Perceptual Grouping",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3482144/",
      "type": "review"
    },
    "action": "Use consistent proximity, alignment, or visual boundaries to match the underlying information groups.",
    "verify": "Ask users to identify grouping and measure errors or disagreement.",
    "limits": "Gestalt principles are perceptual tendencies, not numeric layout prescriptions.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "unclear-current-location",
    "domain": "navigation",
    "title": "Users cannot identify their current location within navigation",
    "signal": "navigationLocationUnclear",
    "kind": "recommendation",
    "source": {
      "title": "Nielsen's 10 Usability Heuristics",
      "url": "https://www.nngroup.com/articles/ten-usability-heuristics/",
      "type": "heuristic"
    },
    "action": "Provide a persistent current-location cue through suitable labels and visual states.",
    "verify": "Ask users where they are after navigating; test with keyboard and screen reader.",
    "limits": "Not every page requires breadcrumbs; choose navigation cues appropriate to topology.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "nonessential-scroll-motion",
    "domain": "motion",
    "title": "Scrolling triggers potentially distracting nonessential motion",
    "signal": "scrollMotionUnnecessary",
    "kind": "standard-guided",
    "source": {
      "title": "WCAG 2.2: Animation from Interactions (AAA)",
      "url": "https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions",
      "type": "standard"
    },
    "action": "Remove gratuitous motion or offer a reliable reduced-motion/disable option.",
    "verify": "Test scrolling with reduced motion on and off, including vestibular-sensitive cases.",
    "limits": "WCAG 2.3.3 is AAA and allows essential animation.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "competing-attention-animation",
    "domain": "motion",
    "title": "Multiple unrelated moving elements compete for attention",
    "signal": "competingAnimations",
    "kind": "recommendation",
    "source": {
      "title": "Nielsen's 10 Usability Heuristics",
      "url": "https://www.nngroup.com/articles/ten-usability-heuristics/",
      "type": "heuristic"
    },
    "action": "Reduce simultaneous movement; reserve animation for state changes or essential attention cues.",
    "verify": "Compare task success and attention with/without motion.",
    "limits": "Attention cost is context-dependent; no universal maximum animation count.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "broken-chart-object-continuity",
    "domain": "motion",
    "title": "Chart transition obscures correspondence between data objects",
    "signal": "chartTransitionBreaksCorrespondence",
    "kind": "recommendation",
    "source": {
      "title": "Heer & Robertson (2007): Animated Transitions in Statistical Data Graphics",
      "url": "https://idl.uw.edu/papers/animated-transitions",
      "type": "empirical"
    },
    "action": "Test staged or object-preserving transitions instead of arbitrary morphs.",
    "verify": "Ask users to track selected data objects across chart states.",
    "limits": "The source studies chart transitions specifically; do not generalize to all page navigation.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  },
  {
    "id": "layout-intensive-animation",
    "domain": "motion",
    "title": "Animation repeatedly changes layout geometry and harms responsiveness",
    "signal": "layoutAnimationJanks",
    "kind": "recommendation",
    "source": {
      "title": "web.dev: Animations and Performance",
      "url": "https://web.dev/articles/animations-and-performance",
      "type": "engineering"
    },
    "action": "Investigate transform/opacity alternatives, or keep layout animation where semantically necessary and proven smooth.",
    "verify": "Record browser performance during the actual animation, including layout and frame timing.",
    "limits": "Animating layout properties is not categorically wrong; measured performance and interaction purpose matter.",
    "allowedEvidence": [
      "rendered",
      "task-analysis",
      "human-review",
      "user-study"
    ]
  }
]);

export function getHciFinding(id) {
  return HCI_FINDINGS.find(f => f.id === id) ?? null;
}

export function listHciFindings(domain) {
  return domain ? HCI_FINDINGS.filter(f => f.domain === domain) : [...HCI_FINDINGS];
}
