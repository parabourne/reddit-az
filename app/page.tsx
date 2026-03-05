"use client";

import { useState, useEffect } from "react";
import { 
  ArrowBigUp, ArrowBigDown, MessageSquare, Share2, 
  Search, Flame, Sun, Moon, Send, ChevronDown 
} from "lucide-react";
import { db, auth } from "./lib/firebase"; 
import { 
  collection, addDoc, updateDoc, doc, query, orderBy, 
  serverTimestamp, onSnapshot, where, increment 
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";

// --- KÖMƏKÇİ FUNKSİYA: Vaxtı formatlamaq üçün ---
const formatTime = (timestamp: any) => {
  if (!timestamp) return "indi";
  try {
    const date = timestamp.toDate();
    return formatDistanceToNow(date, { addSuffix: true, locale: az });
  } catch (err) {
    return "indi";
  }
};

// --- Şərh Komponenti ---
function InlineComments({ postId, user }: { postId: string, user: any }) {
  const [comments, setComments] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "comments"), 
      where("postId", "==", postId), 
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Şərh xətası:", err));
    return () => unsubscribe();
  }, [postId]);

  const handleAddComment = async () => {
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, "comments"), {
        postId,
        text: input,
        author: user?.displayName || "Anonim Sərnişin",
        authorImg: user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "posts", postId), { comments: increment(1) });
      setInput("");
    } catch (err) { console.error(err); }
  };

  const displayedComments = showAll ? comments : comments.slice(-3);

  return (
    <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#151516] p-4">
      <div className="flex gap-3 mb-4">
        <img src={user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png"} className="h-8 w-8 rounded-full" />
        <div className="relative flex-1">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            placeholder="Şərhinizi yazın..." 
            className="w-full bg-white dark:bg-[#272729] border border-gray-200 dark:border-zinc-700 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500 transition-all"
          />
          <button onClick={handleAddComment} className="absolute right-2 top-1.5 text-orange-600 hover:scale-110 transition">
            <Send size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {displayedComments.map((c) => (
          <div key={c.id} className="flex gap-3 animate-in fade-in slide-in-from-top-1">
            <img src={c.authorImg} className="h-7 w-7 rounded-full mt-1" />
            <div className="bg-white dark:bg-[#272729] p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex-1 max-w-[90%]">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] font-bold text-orange-600">u/{c.author}</p>
                <span className="text-[9px] text-gray-400">{formatTime(c.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200">{c.text}</p>
            </div>
          </div>
        ))}

        {comments.length > 3 && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-bold text-gray-500 hover:text-blue-500 flex items-center gap-1 pl-11 pt-1 transition"
          >
            <ChevronDown size={14} className={showAll ? "rotate-180" : ""} />
            {showAll ? "Daha az göstər" : `Daha ${comments.length - 3} şərhi gör`}
          </button>
        )}
      </div>
    </div>
  );
}

// --- Ana Səhifə ---
export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [postInput, setPostInput] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("Yeni");
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) setUser(currentUser);
      else await signInAnonymously(auth).catch(console.error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLoading(true);
    let q;
    const postsRef = collection(db, "posts");
    if (activeFilter === "Top") q = query(postsRef, orderBy("votes", "desc"));
    else if (activeFilter === "Trend") q = query(postsRef, orderBy("votes", "desc"), orderBy("createdAt", "desc"));
    else q = query(postsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });

    return () => unsubscribe();
  }, [activeFilter]);

  const handleAddPost = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && postInput.trim() !== "") {
      try {
        await addDoc(collection(db, "posts"), {
          title: postInput,
          community: "r/baku",
          author: user?.displayName || "Anonim Sərnişin",
          authorImg: user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
          votes: 1,
          comments: 0,
          createdAt: serverTimestamp()
        });
        setPostInput("");
      } catch (err) { alert("Xəta!"); }
    }
  };

  const handleVote = async (postId: string, currentVotes: number, delta: number) => {
    await updateDoc(doc(db, "posts", postId), { votes: currentVotes + delta });
  };

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen transition-colors duration-300`}>
      <div className="bg-[#DAE0E6] dark:bg-[#030303] min-h-screen font-sans text-zinc-900 dark:text-zinc-100">
        
        <nav className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white dark:bg-[#1A1A1B] px-4 md:px-20 border-b border-gray-300 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-orange-600 p-1.5 rounded-full text-white font-bold text-xl h-9 w-9 flex items-center justify-center">R</div>
            <h1 className="hidden md:block text-xl font-bold tracking-tighter">reddit.az</h1>
          </div>
          <div className="flex-1 max-w-lg mx-4 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input type="text" placeholder="Reddit-də axtar" className="w-full bg-gray-100 dark:bg-[#272729] border border-transparent focus:border-blue-500 rounded-full pl-10 pr-4 py-2 text-sm outline-none transition" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition">
              {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
            <div className="text-xs font-bold text-orange-500 hidden sm:block">{user?.isAnonymous ? "Anonim Rejim" : user?.displayName}</div>
          </div>
        </nav>

        <main className="mx-auto flex max-w-6xl gap-6 p-4 md:p-6">
          <div className="flex w-full flex-col gap-4 md:w-2/3">
            <div className="flex items-center gap-3 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-3 shadow-sm">
              <img src={user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png"} className="h-9 w-9 rounded-full bg-gray-200" />
              <input value={postInput} onChange={(e) => setPostInput(e.target.value)} onKeyDown={handleAddPost} placeholder="Fikrinizi anonim paylaşın..." className="flex-1 rounded-md bg-gray-100 dark:bg-[#272729] border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all" />
            </div>

            <div className="flex gap-2 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-2 shadow-sm">
              {["Trend", "Yeni", "Top"].map((f) => (
                <button 
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition ${activeFilter === f ? "bg-gray-100 dark:bg-zinc-800 text-blue-500" : "text-gray-500"}`}
                >
                  {f === "Trend" && <Flame size={18} />} {f}
                </button>
              ))}
            </div>

            {loading ? <div className="text-center py-10 animate-pulse text-gray-500">Yüklənir...</div> : 
              posts.map((post) => (
                <div key={post.id} className="flex flex-col rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] shadow-sm overflow-hidden hover:border-gray-400 transition">
                  <div className="flex">
                    <div className="flex w-10 flex-col items-center bg-gray-50 dark:bg-[#151516] p-2 border-r border-gray-100 dark:border-zinc-800">
                      <button onClick={() => handleVote(post.id, post.votes, 1)} className="text-gray-400 hover:text-orange-600 transition"><ArrowBigUp size={28} /></button>
                      <span className="text-xs font-bold py-1">{post.votes}</span>
                      <button onClick={() => handleVote(post.id, post.votes, -1)} className="text-gray-400 hover:text-blue-600 transition"><ArrowBigDown size={28} /></button>
                    </div>
                    <div className="flex flex-col p-3 w-full">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <img src={post.authorImg} className="w-5 h-5 rounded-full" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-[10px]">{post.community}</span>
                        <span className="flex items-center gap-1">
                          • u/{post.author} • 
                          <span className="opacity-70">{formatTime(post.createdAt)}</span>
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold mb-2 leading-tight">{post.title}</h2>
                      <div className="flex gap-4 text-sm font-bold text-gray-500 mt-2">
                        <button 
                          onClick={() => setOpenPostId(openPostId === post.id ? null : post.id)}
                          className={`flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded transition ${openPostId === post.id ? "text-orange-600 bg-orange-50 dark:bg-orange-600/10" : ""}`}
                        >
                          <MessageSquare size={18} /> {post.comments} Şərh
                        </button>
                        <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded transition"><Share2 size={18} /> Paylaş</button>
                      </div>
                    </div>
                  </div>
                  {openPostId === post.id && <InlineComments postId={post.id} user={user} />}
                </div>
              ))
            }
          </div>

          <div className="hidden w-1/3 flex-col gap-4 md:flex">
            <div className="rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] overflow-hidden shadow-sm">
              <div className="h-10 bg-orange-500 p-2 flex items-center uppercase tracking-wider text-white font-bold text-sm px-4">İcma Haqqında</div>
              <div className="p-4">
                <p className="text-sm italic text-gray-600 dark:text-gray-400 leading-relaxed">Azərbaycanın ən böyük rəqəmsal icmasına xoş gəlmisiniz!</p>
                <div className="flex justify-between border-t border-gray-100 dark:border-zinc-800 mt-4 pt-4">
                  <div className="text-center"><p className="font-bold">25.3k</p><p className="text-[10px] text-gray-500 uppercase">Üzvlər</p></div>
                  <div className="text-center"><p className="font-bold">142</p><p className="text-[10px] text-gray-500 uppercase">Onlayn</p></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}