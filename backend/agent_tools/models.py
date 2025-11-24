"""
SQLAlchemy Models for Agent Tools
"""

from sqlalchemy import Column, String, Boolean, Integer, BigInteger, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from database import Base


class AgentTool(Base):
    """Agent tools configuration"""
    __tablename__ = 'agent_tools'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'), nullable=False)
    userid = Column('userid', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    tooltype = Column('tooltype', String(50), nullable=False)
    toolname = Column('toolname', String(100), nullable=False)
    isenabled = Column('isenabled', Boolean, default=True, nullable=False)

    config = Column('config', JSONB, default={})

    createdat = Column('createdat', DateTime, default=datetime.utcnow)
    updatedat = Column('updatedat', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KnowledgeBaseDocument(Base):
    """Knowledge base documents for RAG"""
    __tablename__ = 'knowledge_base_documents'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'), nullable=False)
    userid = Column('userid', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    filename = Column('filename', String(255), nullable=False)
    filetype = Column('filetype', String(20), nullable=False)
    filesize = Column('filesize', BigInteger)
    filepath = Column('filepath', Text)

    status = Column('status', String(20), default='pending')
    processingerror = Column('processingerror', Text)

    embeddingmodel = Column('embeddingmodel', String(50), default='text-embedding-3-small')
    chunkcount = Column('chunkcount', Integer, default=0)

    extractedtext = Column('extractedtext', Text)
    summary = Column('summary', Text)

    isactive = Column('isactive', Boolean, default=True)
    priority = Column('priority', Integer, default=0)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)
    updatedat = Column('updatedat', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KnowledgeBaseChunk(Base):
    """Document chunks for vector search"""
    __tablename__ = 'knowledge_base_chunks'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    documentid = Column('documentid', String(36), ForeignKey('knowledge_base_documents.id', ondelete='CASCADE'), nullable=False)

    chunkindex = Column('chunkindex', Integer, nullable=False)
    content = Column('content', Text, nullable=False)
    tokencount = Column('tokencount', Integer)

    embedding = Column('embedding', JSONB)
    chunk_metadata = Column('metadata', JSONB, default={})


class FAQEntry(Base):
    """FAQ question/answer pairs"""
    __tablename__ = 'faq_entries'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'), nullable=False)
    userid = Column('userid', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    question = Column('question', Text, nullable=False)
    answer = Column('answer', Text, nullable=False)
    category = Column('category', String(100))

    isactive = Column('isactive', Boolean, default=True)
    priority = Column('priority', Integer, default=0)

    timesused = Column('timesused', Integer, default=0)
    lastusedat = Column('lastusedat', DateTime)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)
    updatedat = Column('updatedat', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CalendarIntegration(Base):
    """Calendar provider integrations"""
    __tablename__ = 'calendar_integrations'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'), nullable=False)
    userid = Column('userid', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    provider = Column('provider', String(50), nullable=False)
    provideraccountid = Column('provideraccountid', String(255))

    accesstoken = Column('accesstoken', Text)
    refreshtoken = Column('refreshtoken', Text)
    tokenexpiresat = Column('tokenexpiresat', DateTime)

    calendarid = Column('calendarid', String(255))
    calendarname = Column('calendarname', String(255))

    defaultduration = Column('defaultduration', Integer, default=30)
    buffertime = Column('buffertime', Integer, default=0)
    timezone = Column('timezone', String(50), default='UTC')

    availabilityrules = Column('availabilityrules', JSONB, default={})

    isactive = Column('isactive', Boolean, default=True)
    lastsyncat = Column('lastsyncat', DateTime)
    syncerror = Column('syncerror', Text)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)
    updatedat = Column('updatedat', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CalendarBooking(Base):
    """Calendar bookings created by agent"""
    __tablename__ = 'calendar_bookings'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'), nullable=False)
    calendarintegrationid = Column('calendarintegrationid', String(36), ForeignKey('calendar_integrations.id', ondelete='CASCADE'), nullable=False)
    calllogid = Column('calllogid', String(36), ForeignKey('call_logs.id'))

    providereventid = Column('providereventid', String(255))
    title = Column('title', String(255), nullable=False)
    description = Column('description', Text)

    starttime = Column('starttime', DateTime, nullable=False)
    endtime = Column('endtime', DateTime, nullable=False)
    timezone = Column('timezone', String(50), default='UTC')

    attendeename = Column('attendeename', String(255))
    attendeeemail = Column('attendeeemail', String(255))
    attendeephone = Column('attendeephone', String(50))

    status = Column('status', String(20), default='scheduled')
    cancellationreason = Column('cancellationreason', Text)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)
    updatedat = Column('updatedat', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailTemplate(Base):
    """Email templates"""
    __tablename__ = 'email_templates'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'))
    userid = Column('userid', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    name = Column('name', String(255), nullable=False)
    subject = Column('subject', String(500), nullable=False)
    bodyhtml = Column('bodyhtml', Text, nullable=False)
    bodytext = Column('bodytext', Text)

    templatetype = Column('templatetype', String(50))
    availablevariables = Column('availablevariables', JSONB, default=[])

    isactive = Column('isactive', Boolean, default=True)
    isdefault = Column('isdefault', Boolean, default=False)

    timesused = Column('timesused', Integer, default=0)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)
    updatedat = Column('updatedat', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SentEmail(Base):
    """Log of sent emails"""
    __tablename__ = 'sent_emails'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'), nullable=False)
    calllogid = Column('calllogid', String(36), ForeignKey('call_logs.id'))
    templateid = Column('templateid', String(36), ForeignKey('email_templates.id'))

    fromaddress = Column('fromaddress', String(255), nullable=False)
    toaddress = Column('toaddress', String(255), nullable=False)
    ccaddress = Column('ccaddress', Text)
    bccaddress = Column('bccaddress', Text)
    subject = Column('subject', String(500), nullable=False)
    bodyhtml = Column('bodyhtml', Text)
    bodytext = Column('bodytext', Text)

    status = Column('status', String(20), default='pending')
    providermessageid = Column('providermessageid', String(255))
    senderror = Column('senderror', Text)

    sentat = Column('sentat', DateTime)
    openedat = Column('openedat', DateTime)
    clickedat = Column('clickedat', DateTime)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)


class SMSTemplate(Base):
    """SMS templates"""
    __tablename__ = 'sms_templates'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'))
    userid = Column('userid', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    name = Column('name', String(255), nullable=False)
    message = Column('message', Text, nullable=False)
    templatetype = Column('templatetype', String(50))

    isactive = Column('isactive', Boolean, default=True)
    isdefault = Column('isdefault', Boolean, default=False)
    timesused = Column('timesused', Integer, default=0)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)
    updatedat = Column('updatedat', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SentSMS(Base):
    """Log of sent SMS messages"""
    __tablename__ = 'sent_sms'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'), nullable=False)
    calllogid = Column('calllogid', String(36), ForeignKey('call_logs.id'))
    templateid = Column('templateid', String(36), ForeignKey('sms_templates.id'))

    fromnumber = Column('fromnumber', String(50), nullable=False)
    tonumber = Column('tonumber', String(50), nullable=False)
    message = Column('message', Text, nullable=False)

    status = Column('status', String(20), default='pending')
    providermessageid = Column('providermessageid', String(255))
    senderror = Column('senderror', Text)

    sentat = Column('sentat', DateTime)
    deliveredat = Column('deliveredat', DateTime)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)


class ToolWebhook(Base):
    """Webhook configurations"""
    __tablename__ = 'tool_webhooks'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'), nullable=False)
    userid = Column('userid', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    name = Column('name', String(255), nullable=False)
    url = Column('url', Text, nullable=False)
    method = Column('method', String(10), default='POST')

    authtype = Column('authtype', String(20))
    authconfig = Column('authconfig', JSONB, default={})

    headers = Column('headers', JSONB, default={})
    bodytemplate = Column('bodytemplate', Text)

    triggerevent = Column('triggerevent', String(50))
    triggerconditions = Column('triggerconditions', JSONB, default={})

    expectresponse = Column('expectresponse', Boolean, default=False)
    responsemapping = Column('responsemapping', JSONB, default={})

    isactive = Column('isactive', Boolean, default=True)

    totalexecutions = Column('totalexecutions', Integer, default=0)
    successfulexecutions = Column('successfulexecutions', Integer, default=0)
    failedexecutions = Column('failedexecutions', Integer, default=0)
    lastexecutedat = Column('lastexecutedat', DateTime)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)
    updatedat = Column('updatedat', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LiveAgent(Base):
    """Live human agents for handoffs"""
    __tablename__ = 'live_agents'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    userid = Column('userid', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    name = Column('name', String(255), nullable=False)
    email = Column('email', String(255), nullable=False)
    phone = Column('phone', String(50))

    skills = Column('skills', JSONB, default=[])

    isavailable = Column('isavailable', Boolean, default=True)
    maxconcurrentcalls = Column('maxconcurrentcalls', Integer, default=1)
    currentcallcount = Column('currentcallcount', Integer, default=0)

    schedule = Column('schedule', JSONB, default={})
    timezone = Column('timezone', String(50), default='UTC')

    isactive = Column('isactive', Boolean, default=True)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)
    updatedat = Column('updatedat', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AgentHandoff(Base):
    """AI to human agent handoffs"""
    __tablename__ = 'agent_handoffs'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'), nullable=False)
    calllogid = Column('calllogid', String(36), ForeignKey('call_logs.id'))
    liveagentid = Column('liveagentid', String(36), ForeignKey('live_agents.id'))

    reason = Column('reason', Text)
    sentiment = Column('sentiment', String(20))
    urgency = Column('urgency', String(20))

    conversationtranscript = Column('conversationtranscript', Text)
    customerinfo = Column('customerinfo', JSONB, default={})
    agentnotes = Column('agentnotes', Text)

    status = Column('status', String(20), default='pending')
    transferredat = Column('transferredat', DateTime, default=datetime.utcnow)
    acceptedat = Column('acceptedat', DateTime)
    completedat = Column('completedat', DateTime)

    resolution = Column('resolution', Text)
    customersatisfaction = Column('customersatisfaction', Integer)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)


class ToolExecutionLog(Base):
    """Audit trail of tool executions"""
    __tablename__ = 'tool_execution_logs'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agentconfigid = Column('agentconfigid', String(36), ForeignKey('agent_configs.id', ondelete='CASCADE'), nullable=False)
    calllogid = Column('calllogid', String(36), ForeignKey('call_logs.id'))
    tooltype = Column('tooltype', String(50), nullable=False)

    functionname = Column('functionname', String(255))
    parameters = Column('parameters', JSONB, default={})
    result = Column('result', JSONB, default={})

    status = Column('status', String(20), nullable=False)
    errormessage = Column('errormessage', Text)
    executiontimems = Column('executiontimems', Integer)

    executedat = Column('executedat', DateTime, default=datetime.utcnow)


class ToolTemplate(Base):
    """Pre-configured tool templates"""
    __tablename__ = 'tool_templates'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    name = Column('name', String(255), nullable=False)
    description = Column('description', Text)
    category = Column('category', String(50))
    icon = Column('icon', String(10))

    tools = Column('tools', JSONB, nullable=False)

    ispublic = Column('ispublic', Boolean, default=True)
    createdby = Column('createdby', String(36), ForeignKey('users.id'))
    usagecount = Column('usagecount', Integer, default=0)

    createdat = Column('createdat', DateTime, default=datetime.utcnow)
