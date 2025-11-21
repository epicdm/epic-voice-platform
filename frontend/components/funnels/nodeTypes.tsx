import DelayNode from "./nodes/DelayNode";
import CallNode from "./nodes/CallNode";
import EmailNode from "./nodes/EmailNode";
import SmsNode from "./nodes/SmsNode";
import WebhookNode from "./nodes/WebhookNode";
import ConditionNode from "./nodes/ConditionNode";
import EndNode from "./nodes/EndNode";

// ReactFlow node type registry
export const nodeTypes = {
  delay: DelayNode,
  call: CallNode,
  email: EmailNode,
  sms: SmsNode,
  webhook: WebhookNode,
  condition: ConditionNode,
  end: EndNode,
};

export default nodeTypes;
