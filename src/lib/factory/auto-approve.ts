/**
 * Build and test switch: when PORT67_AUTO_APPROVE_PRODUCER=true, the producer "start research" step
 * (public-data authorisation plus the four research runs) happens automatically as soon as a customer
 * requests research. Off by default. Source review, insight acceptance and every later approval stay human.
 */
export const autoApproveProducer = () => process.env.PORT67_AUTO_APPROVE_PRODUCER === "true";
export const AUTO_APPROVER = "port67-auto-approve";
