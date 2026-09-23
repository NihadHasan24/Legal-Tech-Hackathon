export default function PhaseTracker({ application = null, caseRecord = null, lawyer = null, mediation = null }) {
  const hasApplication = Boolean(application && application.applicationId)
  const status = application?.status || null
  const reviewState = application?.reviewState || null
  const channel = application?.channel || application?.intakeChannel || null
  const isAccepted = status === 'ACCEPTED'
  const isTerminated = status === 'TERMINATED' || status === 'REJECTED' || caseRecord?.status === 'CLOSED'
  const hasLawyerOrMediation = Boolean(lawyer?.lawyerName || mediation?.stage)
  const isSettled = mediation?.outcome === 'AGREEMENT_REACHED' || caseRecord?.status === 'SETTLED'

  // Determine current active step (0 to 6)
  let currentStep = 0
  if (hasApplication) {
    if (isTerminated) {
      currentStep = 6
    } else if (isSettled) {
      currentStep = 5
    } else if (hasLawyerOrMediation) {
      currentStep = 4
    } else if (isAccepted) {
      currentStep = 3
    } else if (reviewState === 'READY_FOR_DECISION' || status === 'SUBMITTED') {
      currentStep = 2
    } else {
      currentStep = 1
    }
  }

  const channelLabel = !hasApplication
    ? 'Awaiting Submission'
    : channel === 'VOICE_SIM'
      ? '16699 Voice'
      : channel === 'UDC'
        ? 'UDC Center'
        : 'Web Portal'

  const steps = [
    {
      num: 1,
      title: 'Intake Channel',
      subtitle: channelLabel,
      detail: hasApplication ? 'Initial citizen submission recorded' : 'Voice (16699) or Web portal intake',
    },
    {
      num: 2,
      title: 'Application Review',
      subtitle: !hasApplication ? 'Not Started' : reviewState === 'READY_FOR_DECISION' ? 'Reviewed' : 'Submitted',
      detail: !hasApplication ? 'Awaiting initial submission' : reviewState === 'READY_FOR_DECISION' ? 'DLAO review completed' : 'Awaiting officer review',
    },
    {
      num: 3,
      title: 'DLAO Decision',
      subtitle: !hasApplication ? 'Pending' : isAccepted ? 'Case Accepted' : status === 'REJECTED' ? 'Rejected' : 'Pending',
      detail: isAccepted ? `Case ID: ${application.caseId || 'Assigned'}` : 'Officer eligibility determination',
    },
    {
      num: 4,
      title: 'Lawyer or Mediation',
      subtitle: lawyer?.lawyerName ? lawyer.lawyerName : mediation?.stage ? 'Mediation Active' : 'Pending Assignment',
      detail: lawyer?.lawyerName ? `Appointed: ${lawyer.lawyerName}` : 'Legal aid counsel or ADR mediator',
    },
    {
      num: 5,
      title: 'Settlement',
      subtitle: isSettled ? 'Settled' : 'In Progress',
      detail: isSettled ? 'Agreement or resolution reached' : 'Negotiation or court hearing ongoing',
    },
    {
      num: 6,
      title: 'Case Termination',
      subtitle: isTerminated ? 'Closed' : 'Active',
      detail: isTerminated ? 'Final decree or case closed' : 'Awaiting conclusion of proceedings',
    },
  ]

  const summaryText = currentStep === 0
    ? 'Step 0 of 6 \u2022 Awaiting initial submission'
    : `Step ${Math.min(currentStep, 6)} of 6 \u2022 ${steps[currentStep - 1]?.title}`

  return (
    <div className="phase-tracker-card" aria-label="Case Lifecycle Progression">
      <div className="phase-tracker-header">
        <div>
          <span className="phase-tracker-badge">Lifecycle Progression</span>
          <h3 className="phase-tracker-title">Official Legal Aid Progression Path</h3>
        </div>
        <div className={`phase-tracker-summary ${currentStep === 0 ? 'step-zero-summary' : ''}`}>
          {summaryText}
        </div>
      </div>

      <ol className="phase-steps-grid">
        {steps.map((step) => {
          const isCompleted = currentStep > 0 && (step.num < currentStep || (step.num === currentStep && isTerminated && step.num === 6))
          const isCurrent = currentStep > 0 && step.num === currentStep && !isTerminated
          const isFuture = currentStep === 0 || step.num > currentStep

          return (
            <li
              key={step.num}
              className={`phase-step-item ${isCompleted ? 'step-completed' : ''} ${isCurrent ? 'step-active' : ''} ${isFuture ? 'step-upcoming' : ''}`}
            >
              <div className="phase-step-indicator">
                <span className="phase-step-circle">
                  {isCompleted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.num
                  )}
                </span>
                {step.num < 6 && <span className="phase-step-line" aria-hidden="true" />}
              </div>

              <div className="phase-step-content">
                <div className="phase-step-top">
                  <span className="phase-step-title">{step.title}</span>
                </div>
                <div className="phase-step-sub">{step.subtitle}</div>
                <div className="phase-step-detail">{step.detail}</div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

