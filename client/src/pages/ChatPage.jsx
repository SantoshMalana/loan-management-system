import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const ChatPage = () => {
    const { userId } = useParams(); // The other person in the chat
    const { user } = useContext(AuthContext);

    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [msgType, setMsgType] = useState('general');
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);
    // Stable ref so the userId-only useEffect can read latest isOfficer without being in deps
    const isOfficerRef = useRef(['admin', 'loan_officer', 'branch_manager', 'general_manager'].includes(user?.role));

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch inbox list
    const fetchInbox = async () => {
        try {
            // For admins/officers, also fetch all applicants so they can start new chats
            if (['admin', 'loan_officer', 'branch_manager', 'general_manager'].includes(user?.role)) {
                const [inboxRes, appRes] = await Promise.all([
                    api.get('/messages/inbox'),
                    api.get('/messages/applicants')
                ]);

                const inbox = inboxRes.data;
                const applicants = appRes.data;

                // Merge inbox with applicants (applicants without history get empty latest msg)
                const merged = [];
                const seen = new Set();

                inbox.forEach(conv => {
                    merged.push(conv);
                    seen.add(conv.user._id);
                });

                applicants.forEach(app => {
                    if (!seen.has(app._id)) {
                        merged.push({ user: app, unreadCount: 0, lastMessage: null });
                        seen.add(app._id);
                    }
                });

                setConversations(merged);
            } else {
                // For applicants, just fetch inbox
                const res = await api.get('/messages/inbox');
                setConversations(res.data);
            }
        } catch (err) {
            console.error('Failed to load inbox:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch messages for active chat
    const fetchMessages = async (targetId) => {
        try {
            const res = await api.get(`/messages/conversation/${targetId}`);
            setMessages(res.data);
            // Update unread count locally in sidebar list
            setConversations(prev => prev.map(c =>
                c.user._id === targetId ? { ...c, unreadCount: 0 } : c
            ));
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        }
    };

    // Load initial data
    useEffect(() => {
        fetchInbox();
    }, []);

    // Load chat when URL param changes
    useEffect(() => {
        if (userId) {
            fetchMessages(userId);
            // Find user details from existing list, or fetch if not there
            const existing = conversations.find(c => c.user._id === userId);
            if (existing) {
                setSelectedUser(existing.user);
            } else if (isOfficerRef.current) {
                // Only officers have access to /auth/users — safe to call
                api.get(`/auth/users`).then(res => {
                    const found = res.data.find(u => u._id === userId);
                    if (found) setSelectedUser(found);
                }).catch(e => console.log(e));
            }
        } else {
            setMessages([]);
            setSelectedUser(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !userId) return;

        setSending(true);
        try {
            const res = await api.post('/messages', {
                receiverId: userId,
                message: newMessage,
                type: msgType,
            });
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
            setTimeout(scrollToBottom, 100);
            fetchInbox(); // refresh sidebar snippet
        } catch (err) {
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const isOfficer = ['admin', 'loan_officer', 'branch_manager', 'general_manager'].includes(user?.role);
    // Keep ref in sync whenever role changes
    isOfficerRef.current = isOfficer;

    const typeLabels = {
        general: { icon: '💬', label: 'General', color: 'var(--text)' },
        payment_alert: { icon: '💰', label: 'Payment Alert', color: '#0284c7' },
        delay_warning: { icon: '⚠️', label: 'Delay Warning', color: '#d97706' },
        fine_notice: { icon: '🚨', label: 'Fine Notice', color: '#dc2626' },
        approval_notice: { icon: '✅', label: 'Approval Notice', color: '#16a34a' },
        rejection_notice: { icon: '❌', label: 'Rejection Notice', color: '#dc2626' },
        document_request: { icon: '📄', label: 'Document Request', color: '#0284c7' },
        info: { icon: 'ℹ️', label: 'Information', color: 'var(--text-muted)' }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div className="anim-fade" style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: '1rem' }}>

            {/* Conversations Sidebar */}
            <div className="card" style={{ width: '320px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <h4 style={{ margin: 0 }}>Messages</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        {isOfficer ? 'Applicant Communications' : 'Bank Communications'}
                    </p>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {conversations.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                            <div style={{ fontSize: '0.9rem' }}>No conversations yet</div>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <Link
                                to={`/chat/${conv.user._id}`}
                                key={conv.user._id}
                                style={{
                                    display: 'block', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
                                    background: userId === conv.user._id ? 'var(--primary-light)' : 'white',
                                    textDecoration: 'none', color: 'inherit',
                                    borderLeft: userId === conv.user._id ? '3px solid var(--primary)' : '3px solid transparent'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <strong style={{ fontSize: '0.95rem', color: userId === conv.user._id ? 'var(--primary-dark)' : 'var(--text)' }}>
                                        {conv.user.fullName}
                                    </strong>
                                    {conv.unreadCount > 0 && (
                                        <span className="badge badge-danger" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{isOfficer ? `Applicant` : `Bank Officer`}</span>
                                    {conv.user.officerBank && <span>🏦 {conv.user.officerBank}</span>}
                                    {conv.user.bankName && !isOfficer && <span>🏦 {conv.user.bankName}</span>}
                                </div>
                                {conv.lastMessage && (
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {conv.lastMessage.sender?._id === user?.id || conv.lastMessage.sender === user?.id ? 'You: ' : ''}
                                        {conv.lastMessage.type !== 'general' && `${typeLabels[conv.lastMessage.type]?.icon} `}
                                        {conv.lastMessage.message}
                                    </div>
                                )}
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                {!userId ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>💬</div>
                        <h3>Select a conversation</h3>
                        <p>Choose an applicant or officer from the list to start messaging.</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedUser?.fullName || 'Loading...'}</h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {isOfficer ? 'Applicant' : `Bank Officer`}
                                    {selectedUser?.officerBank && ` · 🏦 ${selectedUser.officerBank}`}
                                </div>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f1f5f9' }}>
                            {messages.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                                    <p>No messages in this conversation yet.</p>
                                    <p style={{ fontSize: '0.8rem' }}>Send a message below to start chatting.</p>
                                </div>
                            ) : null}

                            {messages.map((msg, idx) => {
                                const isMine = msg.sender?._id === user?.id || msg.sender === user?.id;
                                const isSystemNotice = msg.type !== 'general' && msg.type !== 'info';

                                return (
                                    <div key={msg._id || idx} style={{
                                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                                        maxWidth: '75%',
                                    }}>
                                        <div style={{
                                            background: isMine ? 'var(--primary)' : 'white',
                                            color: isMine ? 'white' : 'var(--text)',
                                            padding: '0.75rem 1rem',
                                            borderRadius: isMine ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                            boxShadow: 'var(--shadow-sm)',
                                            border: !isMine && isSystemNotice ? `1.5px solid ${typeLabels[msg.type]?.color}` : 'none'
                                        }}>
                                            {/* Badge for special types */}
                                            {msg.type !== 'general' && (
                                                <div style={{
                                                    fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.3rem',
                                                    color: isMine ? 'rgba(255,255,255,0.9)' : typeLabels[msg.type]?.color,
                                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                                    display: 'flex', alignItems: 'center', gap: '0.25rem'
                                                }}>
                                                    {typeLabels[msg.type]?.icon} {typeLabels[msg.type]?.label}
                                                </div>
                                            )}

                                            <div style={{ fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                                {msg.message}
                                            </div>

                                            {/* Metadata line */}
                                            <div style={{
                                                fontSize: '0.65rem', marginTop: '0.4rem', textAlign: 'right',
                                                color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <span>
                                                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMine && (
                                                    <span style={{ marginLeft: '0.5rem' }}>{msg.read ? '✓✓' : '✓'}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'white' }}>
                            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                                {isOfficer && (
                                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                        {['general', 'payment_alert', 'delay_warning', 'fine_notice', 'document_request'].map(t => (
                                            <button
                                                key={t} type="button"
                                                onClick={() => setMsgType(t)}
                                                style={{
                                                    padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                                    background: msgType === t ? 'var(--primary)' : '#f1f5f9',
                                                    color: msgType === t ? 'white' : 'var(--text-muted)'
                                                }}
                                            >
                                                {typeLabels[t].icon} {typeLabels[t].label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type your message here..."
                                        style={{ flex: 1, minHeight: '44px', maxHeight: '120px', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend(e);
                                            }
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={sending || !newMessage.trim()}
                                        style={{ padding: '0 1.5rem', alignSelf: 'flex-end', height: '44px' }}
                                    >
                                        {sending ? '⏳' : 'Send ➤'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
