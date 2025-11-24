"""
Knowledge Base Service
Handles document upload, processing, FAQ management, and RAG queries
"""

import os
import uuid
import PyPDF2
import docx
import tiktoken
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from .models import KnowledgeBaseDocument, KnowledgeBaseChunk, FAQEntry, ToolExecutionLog


class KnowledgeBaseService:
    """Service for managing knowledge base documents and FAQs"""

    def __init__(self, db: Session, storage_path: str = "/opt/livekit1/uploads/knowledge_base"):
        self.db = db
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)

        # Tokenizer for chunk size calculation
        try:
            self.encoding = tiktoken.encoding_for_model("gpt-4")
        except:
            self.encoding = tiktoken.get_encoding("cl100k_base")

    # =========================================================================
    # DOCUMENT UPLOAD & PROCESSING
    # =========================================================================

    def upload_document(
        self,
        agent_config_id: str,
        user_id: str,
        file_content: bytes,
        filename: str,
        file_type: str
    ) -> KnowledgeBaseDocument:
        """
        Upload and process a document for the knowledge base

        Args:
            agent_config_id: Agent this document belongs to
            user_id: User uploading the document
            file_content: Raw file bytes
            filename: Original filename
            file_type: File type (pdf, docx, txt, csv, url)

        Returns:
            KnowledgeBaseDocument instance
        """
        doc_id = str(uuid.uuid4())
        file_path = os.path.join(self.storage_path, f"{doc_id}_{filename}")

        # Save file to disk
        with open(file_path, 'wb') as f:
            f.write(file_content)

        # Create database record
        document = KnowledgeBaseDocument(
            id=doc_id,
            agentconfigid=agent_config_id,
            userid=user_id,
            filename=filename,
            filetype=file_type,
            filesize=len(file_content),
            filepath=file_path,
            status='processing'
        )
        self.db.add(document)
        self.db.commit()

        # Process document asynchronously (or sync for MVP)
        try:
            self._process_document(document)
            document.status = 'completed'
        except Exception as e:
            document.status = 'failed'
            document.processingerror = str(e)
            print(f"Error processing document {doc_id}: {e}")

        self.db.commit()
        return document

    def _process_document(self, document: KnowledgeBaseDocument):
        """
        Extract text from document and create chunks

        Args:
            document: Document to process
        """
        # Extract text based on file type
        if document.filetype == 'pdf':
            text = self._extract_pdf_text(document.filepath)
        elif document.filetype == 'docx':
            text = self._extract_docx_text(document.filepath)
        elif document.filetype in ['txt', 'csv']:
            with open(document.filepath, 'r', encoding='utf-8') as f:
                text = f.read()
        else:
            raise ValueError(f"Unsupported file type: {document.filetype}")

        document.extractedtext = text

        # Generate summary (first 500 chars for now, can use LLM later)
        document.summary = text[:500] + "..." if len(text) > 500 else text

        # Create chunks for RAG
        chunks = self._create_chunks(text, chunk_size=500, overlap=50)
        document.chunkcount = len(chunks)

        # Save chunks to database
        for i, chunk_text in enumerate(chunks):
            chunk = KnowledgeBaseChunk(
                id=str(uuid.uuid4()),
                documentid=document.id,
                chunkindex=i,
                content=chunk_text,
                tokencount=len(self.encoding.encode(chunk_text)),
                chunk_metadata={"page": i // 3 + 1}  # Rough estimate
            )
            self.db.add(chunk)

        self.db.commit()

    def _extract_pdf_text(self, filepath: str) -> str:
        """Extract text from PDF file"""
        text = ""
        try:
            with open(filepath, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            text = ""
        return text

    def _extract_docx_text(self, filepath: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(filepath)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        except Exception as e:
            print(f"Error extracting DOCX text: {e}")
            text = ""
        return text

    def _create_chunks(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Split text into overlapping chunks

        Args:
            text: Full text to chunk
            chunk_size: Target chunk size in tokens
            overlap: Overlap between chunks in tokens

        Returns:
            List of text chunks
        """
        tokens = self.encoding.encode(text)
        chunks = []
        start = 0

        while start < len(tokens):
            end = min(start + chunk_size, len(tokens))
            chunk_tokens = tokens[start:end]
            chunk_text = self.encoding.decode(chunk_tokens)
            chunks.append(chunk_text)
            start += chunk_size - overlap

        return chunks

    def get_documents(self, agent_config_id: str) -> List[KnowledgeBaseDocument]:
        """Get all documents for an agent"""
        return self.db.query(KnowledgeBaseDocument).filter(
            KnowledgeBaseDocument.agentconfigid == agent_config_id,
            KnowledgeBaseDocument.isactive == True
        ).order_by(KnowledgeBaseDocument.priority.desc()).all()

    def delete_document(self, document_id: str) -> bool:
        """Soft delete a document"""
        document = self.db.query(KnowledgeBaseDocument).filter_by(id=document_id).first()
        if document:
            document.isactive = False
            self.db.commit()
            return True
        return False

    # =========================================================================
    # FAQ MANAGEMENT
    # =========================================================================

    def create_faq(
        self,
        agent_config_id: str,
        user_id: str,
        question: str,
        answer: str,
        category: Optional[str] = None
    ) -> FAQEntry:
        """Create a new FAQ entry"""
        faq = FAQEntry(
            id=str(uuid.uuid4()),
            agentconfigid=agent_config_id,
            userid=user_id,
            question=question,
            answer=answer,
            category=category
        )
        self.db.add(faq)
        self.db.commit()
        return faq

    def update_faq(
        self,
        faq_id: str,
        question: Optional[str] = None,
        answer: Optional[str] = None,
        category: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Optional[FAQEntry]:
        """Update an existing FAQ entry"""
        faq = self.db.query(FAQEntry).filter_by(id=faq_id).first()
        if not faq:
            return None

        if question is not None:
            faq.question = question
        if answer is not None:
            faq.answer = answer
        if category is not None:
            faq.category = category
        if is_active is not None:
            faq.isactive = is_active

        faq.updatedat = datetime.utcnow()
        self.db.commit()
        return faq

    def delete_faq(self, faq_id: str) -> bool:
        """Soft delete an FAQ entry"""
        faq = self.db.query(FAQEntry).filter_by(id=faq_id).first()
        if faq:
            faq.isactive = False
            self.db.commit()
            return True
        return False

    def get_faqs(
        self,
        agent_config_id: str,
        category: Optional[str] = None
    ) -> List[FAQEntry]:
        """Get all FAQs for an agent, optionally filtered by category"""
        query = self.db.query(FAQEntry).filter(
            FAQEntry.agentconfigid == agent_config_id,
            FAQEntry.isactive == True
        )

        if category:
            query = query.filter(FAQEntry.category == category)

        return query.order_by(FAQEntry.priority.desc()).all()

    def bulk_import_faqs(
        self,
        agent_config_id: str,
        user_id: str,
        faqs_data: List[Dict[str, str]]
    ) -> List[FAQEntry]:
        """
        Bulk import FAQs from a list

        Args:
            agent_config_id: Agent ID
            user_id: User ID
            faqs_data: List of dicts with 'question', 'answer', and optional 'category'

        Returns:
            List of created FAQ entries
        """
        created_faqs = []

        for faq_data in faqs_data:
            faq = FAQEntry(
                id=str(uuid.uuid4()),
                agentconfigid=agent_config_id,
                userid=user_id,
                question=faq_data.get('question'),
                answer=faq_data.get('answer'),
                category=faq_data.get('category')
            )
            self.db.add(faq)
            created_faqs.append(faq)

        self.db.commit()
        return created_faqs

    # =========================================================================
    # RAG QUERY (used by AI agent at runtime)
    # =========================================================================

    def search_knowledge_base(
        self,
        agent_config_id: str,
        query: str,
        max_results: int = 5,
        call_log_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Search knowledge base for relevant information

        This is a simple keyword search for MVP.
        In production, use vector embeddings with pgvector or Pinecone.

        Args:
            agent_config_id: Agent ID
            query: Search query
            max_results: Maximum results to return
            call_log_id: Optional call log ID for tracking

        Returns:
            List of relevant results with source info
        """
        results = []

        # Search documents (full text search)
        documents = self.db.query(KnowledgeBaseDocument).filter(
            KnowledgeBaseDocument.agentconfigid == agent_config_id,
            KnowledgeBaseDocument.isactive == True,
            KnowledgeBaseDocument.extractedtext.ilike(f'%{query}%')
        ).limit(max_results).all()

        for doc in documents:
            # Find relevant chunks
            chunks = self.db.query(KnowledgeBaseChunk).filter(
                KnowledgeBaseChunk.documentid == doc.id,
                KnowledgeBaseChunk.content.ilike(f'%{query}%')
            ).limit(3).all()

            for chunk in chunks:
                results.append({
                    'source_type': 'document',
                    'source_name': doc.filename,
                    'content': chunk.content,
                    'relevance_score': 0.8  # Placeholder
                })

        # Search FAQs
        faqs = self.db.query(FAQEntry).filter(
            FAQEntry.agentconfigid == agent_config_id,
            FAQEntry.isactive == True,
            FAQEntry.question.ilike(f'%{query}%')
        ).limit(max_results).all()

        for faq in faqs:
            faq.timesused += 1
            faq.lastusedat = datetime.utcnow()
            results.append({
                'source_type': 'faq',
                'source_name': f"FAQ: {faq.question}",
                'content': faq.answer,
                'relevance_score': 0.9
            })

        self.db.commit()

        # Log tool execution
        if call_log_id:
            log = ToolExecutionLog(
                id=str(uuid.uuid4()),
                agentconfigid=agent_config_id,
                calllogid=call_log_id,
                tooltype='knowledge_base',
                functionname='search',
                parameters={'query': query},
                result={'result_count': len(results)},
                status='success',
                executedat=datetime.utcnow()
            )
            self.db.add(log)
            self.db.commit()

        return sorted(results, key=lambda x: x['relevance_score'], reverse=True)[:max_results]

    # =========================================================================
    # STATISTICS
    # =========================================================================

    def get_statistics(self, agent_config_id: str) -> Dict:
        """Get knowledge base statistics for an agent"""
        docs_count = self.db.query(KnowledgeBaseDocument).filter(
            KnowledgeBaseDocument.agentconfigid == agent_config_id,
            KnowledgeBaseDocument.isactive == True
        ).count()

        faqs_count = self.db.query(FAQEntry).filter(
            FAQEntry.agentconfigid == agent_config_id,
            FAQEntry.isactive == True
        ).count()

        total_chunks = self.db.query(KnowledgeBaseChunk).join(
            KnowledgeBaseDocument
        ).filter(
            KnowledgeBaseDocument.agentconfigid == agent_config_id,
            KnowledgeBaseDocument.isactive == True
        ).count()

        return {
            'documents_count': docs_count,
            'faqs_count': faqs_count,
            'total_chunks': total_chunks
        }
