import { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const STAFF_ROLES = ['branch_manager', 'admin'];

const fmt = (d) => new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
});

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
});

const ChatPage = () => {
    const { userId } = useParams(); // if navigated from /chat/:userId
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [conversations, setConversations] = useState([]);
    const [activeUser, setActiveUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]); // for staff to start new chats
    const [searchQuery, setSearchQuery] = useState('');
    const bottomRef = useRef(null);
    const pollRef = useRef(null);

    const isStaff = STAFF_ROLES.includes(user?.role);

    // Load inbox conversations
    const loadConversations = async () => {
        try {
            const res = await api.get('/messages/inbox');
            setConversations(res.data);
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            setLoadingConvs(false);
        }
    };

    // For staff: load list of applicants to start new conversations
    const loadApplicants = async () => {
        if (!isStaff) return;
        try {
            const res = await api.get('/messages/applicants');
            setAvailableUsers(res.data);
        } catch (err) {
            console.error('Failed to load applicants:', err);
        }
    };

    useEffect(() => {
        loadConversations();
        loadApplicants();
    }, []);

    // Auto-open conversation if userId in URL
    useEffect(() => {
        if (userId && !activeUser) {
            openConversation(userId);
        }
    }, [userId, availableUsers, conversations]);

    // Scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Poll for new messages every 5 seconds when a conversation is open
    useEffect(() => {
        if (!activeUser) return;
        pollRef.current = setInterval(() => {
            loadMessages(activeUser._id, false);
        }, 5000);
        return () => clearInterval(pollRef.current);
    }, [activeUser]);

    const openConversation = async (targetUserId) => {
        // Find user from conversations or available users
        let targetUser =
            conversations.find(c => c.user._id === targetUserId)?.user ||
            availableUsers.find(u => u._id === targetUserId);

        // If not found yet (URL navigation before data loads), fetch directly
        if (!targetUser) {
            try {
                const res = await api.get(`/auth/users`);
                targetUser = res.data.find(u => u._id === targetUserId);
            } catch {}
        }

        if (targetUser) {
            setActiveUser(targetUser);
            await loadMessages(targetUserId, true);
            navigate(`/chat/${targetUserId}`, { replace: true });
        }
    };

    const loadMessages = async (targetUserId, showLoading = true) => {
        if (showLoading) setLoadingMsgs(true);
        try {
            const res = await api.get(`/messages/conversation/${targetUserId}`);
            setMessages(res.data);
            // Refresh conversation list to update unread counts
            loadConversations();
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoadingMsgs(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMsg.trim() || !activeUser || sending) return;
        setSending(true);
        try {
            const res = await api.post('/messages', {
                receiverId: activeUser._id,
                message: newMsg.trim(),
                type: 'general',
            });
            setMessages(prev => [...prev, res.data]);
            setNewMsg('');
            loadConversations();
        } catch (err) {
            console.error('Send failed:', err);
        } finally {
            setSending(false);
        }
    };

    // Group messages by date
    const groupByDate = (msgs) => {
        const groups = [];
        let lastDate = null;
        msgs.forEach(msg => {
            const d = fmtDate(msg.createdAt);
            if (d !== lastDate) {
                groups.push({ type: 'date', label: d });
                lastDate = d;
            }
            groups.push({ type: 'msg', data: msg });
        });
        return groups;
    };

    const grouped = groupByDate(messages);

    const filteredConversations = conversations.filter(c =>
        !searchQuery ||
        c.user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // For staff: applicants not yet in conversations
    const newChatCandidates = availableUsers.filter(u =>
        !conversations.find(c => c.user._id === u._id) &&
        (!searchQuery ||
            u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: 'var(--bg)', overflow: 'hidden', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>

            {/* ── Left: Conversation List ── */}
            <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'white' }}>
                {/* Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
                        💬 {isStaff ? 'Applicant Messages' : 'My Messages'}
                    </h3>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
                    />
                </div>

                {/* Conversation list */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loadingConvs ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Loading...
                        </div>
                    ) : (
                        <>
                            {/* Existing conversations */}
                            {filteredConversations.map(conv => (
                                <ConvItem
                                    key={conv.user._id}
                                    conv={conv}
                                    isActive={activeUser?._id === conv.user._id}
                                    onClick={() => openConversation(conv.user._id)}
                                    currentUserId={user?._id}
                                />
                            ))}

                            {/* Staff: start new chat with applicants */}
                            {isStaff && newChatCandidates.length > 0 && (
                                <>
                                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderTop: filteredConversations.length > 0 ? '1px solid var(--border)' : 'none', marginTop: '0.25rem' }}>
                                        Start New Chat
                                    </div>
                                    {newChatCandidates.map(u => (
                                        <button
                                            key={u._id}
                                            onClick={() => { setActiveUser(u); setMessages([]); navigate(`/chat/${u._id}`, { replace: true }); }}
                                            style={{ width: '100%', background: 'none', border: 'none', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left' }}
                                        >
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#4f46e5', flexShrink: 0 }}>
                                                {(u.fullName || u.username || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.fullName || u.username}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Applicant · {u.phone || u.email}</div>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}

                            {filteredConversations.length === 0 && newChatCandidates.length === 0 && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                                    <div style={{ fontSize: '0.85rem' }}>
                                        {isStaff ? 'No applicants yet.' : 'No messages yet.'}
                                    </div>
                                    {!isStaff && (
                                        <div style={{ fontSize: '0.78rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                            Your bank manager will message you here about your loan application.
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Right: Chat Window ── */}
            {activeUser ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* Chat Header */}
                    <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'white', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem', flexShrink: 0 }}>
                            {(activeUser.fullName || activeUser.username || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                {activeUser.fullName || activeUser.username}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {activeUser.role === 'applicant' || activeUser.role === 'user'
                                    ? `Applicant · ${activeUser.phone || activeUser.email || ''}`
                                    : `${activeUser.role?.replace(/_/g, ' ')}${activeUser.officerBank ? ` · ${activeUser.officerBank}` : ''}`
                                }
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: '#f8fafc' }}>
                        {loadingMsgs ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>Loading messages...</div>
                        ) : grouped.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', fontSize: '0.85rem' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👋</div>
                                Send the first message to {activeUser.fullName || activeUser.username}.
                            </div>
                        ) : (
                            grouped.map((item, i) => {
                                if (item.type === 'date') {
                                    return (
                                        <div key={i} style={{ textAlign: 'center', margin: '0.75rem 0 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            <span style={{ background: '#e5e7eb', padding: '2px 12px', borderRadius: 20 }}>{item.label}</span>
                                        </div>
                                    );
                                }
                                const msg = item.data;
                                const isMine = msg.sender?._id === user?._id || msg.sender === user?._id;
                                return (
                                    <div key={msg._id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '0.15rem' }}>
                                        <div style={{
                                            maxWidth: '68%', padding: '0.6rem 0.9rem',
                                            borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                            background: isMine ? 'var(--primary)' : 'white',
                                            color: isMine ? 'white' : 'var(--text)',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                            fontSize: '0.875rem', lineHeight: 1.5,
                                        }}>
                                            <div>{msg.message}</div>
                                            {msg.loan && (
                                                <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: '0.3rem', fontStyle: 'italic' }}>
                                                    Re: {msg.loan.loanType} Loan · {msg.loan.applicationNumber}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.65rem', opacity: 0.65, marginTop: '0.2rem', textAlign: 'right' }}>
                                                {fmt(msg.createdAt)}
                                                {isMine && <span style={{ marginLeft: '0.3rem' }}>{msg.read ? '✓✓' : '✓'}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Message Input */}
                    <form onSubmit={sendMessage} style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)', background: 'white', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                        <textarea
                            value={newMsg}
                            onChange={e => setNewMsg(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                            placeholder={`Message ${activeUser.fullName || activeUser.username}...`}
                            rows={1}
                            style={{
                                flex: 1, resize: 'none', fontSize: '0.88rem',
                                padding: '0.6rem 0.9rem', borderRadius: 20,
                                border: '1.5px solid var(--border)', outline: 'none',
                                fontFamily: 'inherit', lineHeight: 1.5,
                                maxHeight: 100, overflowY: 'auto',
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!newMsg.trim() || sending}
                            style={{
                                width: 42, height: 42, borderRadius: '50%', border: 'none',
                                background: newMsg.trim() ? 'var(--primary)' : 'var(--border)',
                                color: 'white', cursor: newMsg.trim() ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.1rem', flexShrink: 0, transition: 'background 0.15s',
                            }}
                        >
                            {sending ? '⏳' : '➤'}
                        </button>
                    </form>
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💬</div>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>
                            {isStaff ? 'Select an Applicant' : 'Your Messages'}
                        </h3>
                        <p style={{ fontSize: '0.88rem', maxWidth: 320 }}>
                            {isStaff
                                ? 'Choose an applicant from the list to start a conversation about their loan application.'
                                : 'Your bank manager will contact you here about your loan application status or required documents.'
                            }
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

// Conversation list item
const ConvItem = ({ conv, isActive, onClick, currentUserId }) => {
    const { user: other, lastMessage, unreadCount } = conv;
    const isMine = lastMessage?.sender?._id === currentUserId || lastMessage?.sender === currentUserId;
    const initials = (other.fullName || other.username || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <button
            onClick={onClick}
            style={{
                width: '100%', background: isActive ? 'var(--primary-light)' : 'none',
                border: 'none', borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                padding: '0.85rem 1rem', display: 'flex', alignItems: 'center',
                gap: '0.75rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}
        >
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: isActive ? 'var(--primary)' : '#e0e7ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.82rem', fontWeight: 700,
                    color: isActive ? 'white' : '#4f46e5',
                }}>
                    {initials}
                </div>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: -2, right: -2,
                        background: '#dc2626', color: 'white', borderRadius: '50%',
                        width: 16, height: 16, fontSize: '0.6rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {unreadCount}
                    </span>
                )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: unreadCount > 0 ? 700 : 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {other.fullName || other.username}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.5rem' }}>
                        {fmt(lastMessage?.createdAt)}
                    </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: unreadCount > 0 ? 'var(--text)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px', fontWeight: unreadCount > 0 ? 600 : 400 }}>
                    {isMine && <span style={{ color: 'var(--text-muted)' }}>You: </span>}
                    {lastMessage?.message}
                </div>
            </div>
        </button>
    );
};

export default ChatPage;
