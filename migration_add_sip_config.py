#!/usr/bin/env python3
"""
Migration script to add SIP configuration table to the database.
"""
import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Add project directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import Base, engine, SessionLocal, User

# Define the new SIPConfig model
class SIPConfig(Base):
    """SIP server configurations per user."""
    __tablename__ = 'sip_configs'
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    sip_url = Column(String(255), nullable=False)  # SIP server URL
    sip_username = Column(String(255))  # Auth username (if needed)
    sip_password = Column(String(255))  # Auth password (if needed)
    sip_transport = Column(String(50), default='tcp')  # udp, tcp, tls
    trunk_id = Column(String(100))  # LiveKit trunk ID
    is_default = Column(Boolean, default=False)
    inbound_enabled = Column(Boolean, default=True)
    outbound_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add any additional fields needed for SIP configuration

def run_migration():
    """Run the migration to add the SIPConfig table."""
    print("Creating SIPConfig table...")
    Base.metadata.create_all(bind=engine)
    
    # Create a default SIP config for each user
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            # Check if user already has a SIP config
            exists = db.query(SIPConfig).filter(SIPConfig.user_id == user.id).first()
            if not exists:
                import uuid
                # Create default SIP config
                default_config = SIPConfig(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    name="Default SIP Config",
                    sip_url="voice.epic.dm",
                    sip_transport="tcp",
                    trunk_id=os.getenv('SIP_OUTBOUND_TRUNK_ID', 'ST_sTo8gGpNbXzY'),
                    is_default=True
                )
                db.add(default_config)
        db.commit()
        print(f"✅ Created default SIP configs for {len(users)} users")
    except Exception as e:
        db.rollback()
        print(f"Error creating default SIP configs: {e}")
    finally:
        db.close()
    
    print("✅ SIPConfig table added successfully")

if __name__ == '__main__':
    run_migration()
