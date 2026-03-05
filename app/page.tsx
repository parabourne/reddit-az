"use client";

import { useState, useEffect } from "react";
import { 
  ArrowBigUp, ArrowBigDown, MessageSquare, Share2, 
  Search, Flame, Sun, Moon, Send, ChevronDown, Plus, X,
  Facebook 
} from "lucide-react";
import { db, auth } from "./lib/firebase"; 
import { 
  collection, addDoc, updateDoc, doc, query, orderBy, 
  serverTimestamp, onSnapshot, where, increment 
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import toast, { Toaster } from "react-hot-toast";

const formatTime = (timestamp: any) => {
  if (!timestamp) return "indi";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true, locale: az });
  } catch (err) { return "indi"; }
};

// --- Şərh Komponenti ---
function InlineComments({ postId, user }: { postId: string, user: any }) {
  const [comments, setComments] = useState<any[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const q = query(collection(db, "comments"), where("postId", "==", postId), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [postId]);

  const handleAddComment = async () => {
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, "comments"), {
        postId,
        text: input,
        author: user?.displayName || "Anonim",
        authorImg: user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "posts", postId), { comments: increment(1) });
      setInput("");
      toast.success("Şərh əlavə edildi!");
    } catch (err) { toast.error("Xəta baş verdi!"); }
  };

  return (
    <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#151516] p-4">
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            placeholder="Şərhinizi yazın..." 
            className="w-full bg-white dark:bg-[#272729] border border-gray-200 dark:border-zinc-700 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500"
          />
          <button onClick={handleAddComment} className="absolute right-2 top-1.5 text-orange-600"><Send size={20} /></button>
        </div>
      </div>
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <img src={c.authorImg} className="h-7 w-7 rounded-full" alt="avatar" />
            <div className="bg-white dark:bg-[#272729] p-2 rounded-2xl flex-1 border border-gray-100 dark:border-zinc-800 text-sm">
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="font-bold text-orange-600">u/{c.author}</span>
                <span className="text-gray-400">{formatTime(c.createdAt)}</span>
              </div>
              <p>{c.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Ana Səhifə ---
export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [postInput, setPostInput] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // AXTARIŞ STATE
  const [selectedCommunity, setSelectedCommunity] = useState("r/baku");
  const [activeCommunity, setActiveCommunity] = useState<string | null>(null); 
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("Yeni");
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  const communities = ["r/baku", "r/texnologiya", "r/musiqi", "r/it_azerbaijan", "r/heyat"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) setUser(currentUser);
      else await signInAnonymously(auth);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLoading(true);
    const postsRef = collection(db, "posts");
    
    let q;
    if (activeCommunity) {
      q = query(postsRef, where("community", "==", activeCommunity), orderBy("createdAt", "desc"));
    } else {
      q = activeFilter === "Top" 
        ? query(postsRef, orderBy("votes", "desc"))
        : query(postsRef, orderBy("createdAt", "desc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (activeFilter === "Trend" && !activeCommunity) {
        fetchedPosts = fetchedPosts.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || Date.now() / 1000;
          const timeB = b.createdAt?.seconds || Date.now() / 1000;
          const hoursA = (Date.now() / 1000 - timeA) / 3600;
          const hoursB = (Date.now() / 1000 - timeB) / 3600;
          const scoreA = (a.votes || 0) / Math.pow(hoursA + 2, 1.5);
          const scoreB = (b.votes || 0) / Math.pow(hoursB + 2, 1.5);
          return scoreB - scoreA;
        });
      }

      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      console.error("Firestore xətası:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeFilter, activeCommunity]);

  // AXTARIŞ FİLTRLƏMƏSİ
  const filteredPosts = posts.filter((post) =>
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.community?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    if (!user) return toast.error("Səs vermək üçün giriş etməlisiniz!");

    const postRef = doc(db, "posts", postId);
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const userId = user.uid;
    const upvotedBy = post.upvotedBy || [];
    const downvotedBy = post.downvotedBy || [];

    let newVotes = post.votes || 0;
    let newUpvotedBy = [...upvotedBy];
    let newDownvotedBy = [...downvotedBy];

    if (direction === 'up') {
      if (upvotedBy.includes(userId)) {
        newVotes -= 1;
        newUpvotedBy = newUpvotedBy.filter(id => id !== userId);
      } else {
        newVotes += downvotedBy.includes(userId) ? 2 : 1;
        newUpvotedBy.push(userId);
        newDownvotedBy = newDownvotedBy.filter(id => id !== userId);
      }
    } else {
      if (downvotedBy.includes(userId)) {
        newVotes += 1;
        newDownvotedBy = newDownvotedBy.filter(id => id !== userId);
      } else {
        newVotes -= upvotedBy.includes(userId) ? 2 : 1;
        newDownvotedBy.push(userId);
        newUpvotedBy = newUpvotedBy.filter(id => id !== userId);
      }
    }

    try {
      await updateDoc(postRef, {
        votes: newVotes,
        upvotedBy: newUpvotedBy,
        downvotedBy: newDownvotedBy
      });
    } catch (err) {
      toast.error("Xəta baş verdi!");
    }
  };

  const handleAddPost = async () => {
    if (!postInput.trim()) return;
    const loadingToast = toast.loading("Paylaşılır...");
    try {
      await addDoc(collection(db, "posts"), {
        title: postInput,
        community: selectedCommunity,
        author: user?.displayName || "Anonim",
        authorImg: user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
        votes: 1,
        upvotedBy: [user?.uid],
        downvotedBy: [],
        comments: 0,
        createdAt: serverTimestamp()
      });
      setPostInput("");
      toast.success("Post paylaşıldı!", { id: loadingToast });
    } catch (err) { toast.error("Xəta!", { id: loadingToast }); }
  };

  const handleCrosspost = async (originalPost: any) => {
    if (!user) return toast.error("Paylaşmaq üçün giriş etməlisiniz!");
    const loadingToast = toast.loading("Yenidən paylaşılır...");
    try {
      await addDoc(collection(db, "posts"), {
        title: originalPost.title,
        community: selectedCommunity, 
        author: user?.displayName || "Anonim",
        authorImg: user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
        votes: 1,
        upvotedBy: [user?.uid],
        downvotedBy: [],
        comments: 0,
        createdAt: serverTimestamp(),
        isCrosspost: true,
        originalAuthor: originalPost.author,
        originalCommunity: originalPost.community
      });
      toast.success("Uğurla yenidən paylaşıldı!", { id: loadingToast });
    } catch (err) { toast.error("Paylaşarkən xəta!", { id: loadingToast }); }
  };

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen transition-colors duration-300`}>
      <Toaster position="bottom-right" />
      <div className="bg-[#DAE0E6] dark:bg-[#030303] min-h-screen text-zinc-900 dark:text-zinc-100 font-sans">
        
        {/* NAVBAR */}
        <nav className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white dark:bg-[#1A1A1B] px-4 md:px-20 border-b dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setActiveCommunity(null); setSearchQuery("");}}>
            <div className="bg-orange-600 p-1.5 rounded-full text-white font-bold h-9 w-9 flex items-center justify-center shadow-lg">R</div>
            <h1 className="hidden md:block text-xl font-bold tracking-tight">reddit.az</h1>
          </div>

          {/* AXTARIŞ INPUTU */}
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Postlarda və ya icmalarda axtar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 dark:bg-[#272729] border border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-[#1A1A1B] rounded-full py-1.5 pl-10 pr-10 outline-none text-sm transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition">
                {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
          </div>
        </nav>

        <main className="mx-auto flex max-w-6xl gap-6 p-4 md:p-6">
          <div className="flex w-full flex-col gap-4 md:w-2/3">
            
            {activeCommunity && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-md shadow-sm">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Göstərilir: <span className="underline">{activeCommunity}</span></p>
                <button onClick={() => setActiveCommunity(null)} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-red-500 transition">
                  <X size={14} /> Təmizlə
                </button>
              </div>
            )}

            {/* YENİ POST YARATMA */}
            <div className="flex flex-col gap-3 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <img src={user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png"} className="h-9 w-9 rounded-full" alt="user" />
                <input 
                  value={postInput} 
                  onChange={(e) => setPostInput(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleAddPost()}
                  placeholder="Nə düşünürsünüz?" 
                  className="flex-1 rounded-md bg-gray-100 dark:bg-[#272729] border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" 
                />
              </div>
              <div className="flex justify-between items-center border-t dark:border-zinc-800 pt-3">
                <select 
                  value={selectedCommunity} 
                  onChange={(e) => setSelectedCommunity(e.target.value)}
                  className="bg-gray-100 dark:bg-[#272729] text-xs font-bold p-1.5 rounded border border-transparent outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
                >
                  {communities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={handleAddPost} className="bg-blue-600 text-white px-5 py-1.5 rounded-full text-sm font-bold hover:bg-blue-700 shadow-md transition transform active:scale-95">Paylaş</button>
              </div>
            </div>

            {/* FİLTRLƏR */}
            {!activeCommunity && !searchQuery && (
              <div className="flex gap-2 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-2 overflow-x-auto">
                {["Trend", "Yeni", "Top"].map((f) => (
                  <button 
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeFilter === f ? "bg-gray-100 dark:bg-zinc-800 text-blue-500 shadow-inner" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800/50"}`}
                  >
                    {f === "Trend" && <Flame size={18} />} {f}
                  </button>
                ))}
              </div>
            )}

            {/* POSTLAR SİYAHISI */}
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-zinc-800 rounded"></div>)}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1A1A1B] rounded border border-dashed border-gray-300 dark:border-zinc-800">
                <Search size={48} className="text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium">"{searchQuery}" üçün heç bir nəticə tapılmadı.</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div key={post.id} className="flex flex-col rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] shadow-sm hover:border-gray-400 dark:hover:border-zinc-600 transition-colors overflow-hidden">
                  <div className="flex">
                    <div className="flex w-10 flex-col items-center bg-gray-50 dark:bg-[#151516] p-2 border-r dark:border-zinc-800">
                      <button onClick={() => handleVote(post.id, 'up')} className={`${post.upvotedBy?.includes(user?.uid) ? "text-orange-600" : "text-gray-400"} hover:bg-gray-200 dark:hover:bg-zinc-800 rounded p-1 transition`}>
                        <ArrowBigUp size={28} fill={post.upvotedBy?.includes(user?.uid) ? "currentColor" : "none"} />
                      </button>
                      <span className={`text-xs font-bold py-1 ${post.upvotedBy?.includes(user?.uid) ? "text-orange-600" : post.downvotedBy?.includes(user?.uid) ? "text-blue-600" : ""}`}>
                        {post.votes}
                      </span>
                      <button onClick={() => handleVote(post.id, 'down')} className={`${post.downvotedBy?.includes(user?.uid) ? "text-blue-600" : "text-gray-400"} hover:bg-gray-200 dark:hover:bg-zinc-800 rounded p-1 transition`}>
                        <ArrowBigDown size={28} fill={post.downvotedBy?.includes(user?.uid) ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <div className="flex flex-col p-3 w-full">
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
                        <span onClick={() => setActiveCommunity(post.community)} className="font-bold text-zinc-900 dark:text-zinc-100 uppercase hover:underline cursor-pointer">
                          {post.community}
                        </span>
                        <span>• u/{post.author} • {formatTime(post.createdAt)}</span>
                      </div>
                      <h2 className="text-lg font-semibold mb-2 leading-tight">{post.title}</h2>
                      {post.isCrosspost && (
                        <div className="mb-3 p-2 border-l-4 border-orange-500 bg-gray-50 dark:bg-zinc-900/50 rounded-r text-[11px]">
                           <p className="text-gray-500 italic">Yenidən paylaşıldı: <span className="font-bold text-orange-600">{post.originalCommunity}</span> • u/{post.originalAuthor}</p>
                        </div>
                      )}
                      <div className="flex gap-4 text-xs font-bold text-gray-500 mt-auto pt-2">
                        <button onClick={() => setOpenPostId(openPostId === post.id ? null : post.id)} className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded transition">
                          <MessageSquare size={18} /> {post.comments || 0} Şərh
                        </button>
                        <button onClick={() => handleCrosspost(post)} className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded transition">
                          <Share2 size={18} /> Paylaş
                        </button>
                      </div>
                    </div>
                  </div>
                  {openPostId === post.id && <InlineComments postId={post.id} user={user} />}
                </div>
              ))
            )}
          </div>

          {/* ASIDE - SAĞ PANEL */}
          <aside className="hidden w-1/3 flex-col gap-4 md:flex">
            <div className="rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] overflow-hidden shadow-sm">
               <div className="h-10 bg-blue-600 p-2 flex items-center uppercase text-white font-bold text-[10px] px-4">Populyar İcmalar</div>
               <div className="p-2 flex flex-col gap-1">
                  <div onClick={() => setActiveCommunity(null)} className={`flex items-center gap-3 p-2 rounded cursor-pointer transition text-sm font-semibold ${!activeCommunity ? "bg-gray-100 dark:bg-zinc-800" : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"}`}>
                    🏠 Hamısı (All)
                  </div>
                  {communities.map(c => (
                    <div key={c} onClick={() => setActiveCommunity(c)} className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${activeCommunity === c ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"}`}>
                      <span className="text-sm font-semibold">{c}</span>
                      <ChevronDown size={14} className="-rotate-90 opacity-40" />
                    </div>
                  ))}
               </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-[#1A1A1B] rounded border border-gray-300 dark:border-zinc-800 shadow-sm">
              <h3 className="text-xs font-bold uppercase mb-2 text-gray-500">Haqqımızda</h3>
              <p className="text-xs leading-relaxed opacity-70 mb-4">Reddit.az Azərbaycanın müzakirə platformasıdır. İcmalarımıza qoşulun!</p>
              <div className="space-y-3 border-t dark:border-zinc-800 pt-4">
                <a href="https://wa.me/994555556963" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-semibold hover:text-green-500 transition group">
                   <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full group-hover:bg-green-500 transition-colors">
                      <MessageSquare size={14} className="text-green-600 group-hover:text-white" />
                   </div>
                   WhatsApp: 055 555 69 63
                </a>
                <a href="https://www.facebook.com/parabournex" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-semibold hover:text-blue-500 transition group">
                   <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full group-hover:bg-blue-600 transition-colors">
                      <Facebook size={14} className="text-blue-600 group-hover:text-white" />
                   </div>
                   Facebook: parabournex
                </a>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}