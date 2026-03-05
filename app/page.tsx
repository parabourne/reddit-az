"use client";

import { useState, useEffect } from "react";
import { 
  ArrowBigUp, ArrowBigDown, MessageSquare, Share2, 
  Search, Flame, Sun, Moon, Send, ChevronDown, Plus
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
  const [showAll, setShowAll] = useState(false);

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

  const displayedComments = showAll ? comments : comments.slice(-3);

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
        {displayedComments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <img src={c.authorImg} className="h-7 w-7 rounded-full" />
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
  const [selectedCommunity, setSelectedCommunity] = useState("r/baku");
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
    let q = query(postsRef, orderBy("createdAt", "desc"));

    if (activeFilter === "Top") q = query(postsRef, orderBy("votes", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // --- TREND ALQORİTMİ (Client-side sorting) ---
      if (activeFilter === "Trend") {
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
    });
    return () => unsubscribe();
  }, [activeFilter]);

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
        comments: 0,
        createdAt: serverTimestamp()
      });
      setPostInput("");
      toast.success("Post paylaşıldı!", { id: loadingToast });
    } catch (err) { toast.error("Xəta!", { id: loadingToast }); }
  };

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen`}>
      <Toaster position="bottom-right" />
      <div className="bg-[#DAE0E6] dark:bg-[#030303] min-h-screen text-zinc-900 dark:text-zinc-100">
        
        {/* Navbar eynidir... */}
        <nav className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white dark:bg-[#1A1A1B] px-4 md:px-20 border-b dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-orange-600 p-1.5 rounded-full text-white font-bold h-9 w-9 flex items-center justify-center">R</div>
            <h1 className="hidden md:block text-xl font-bold">reddit.az</h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition">
              {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
          </button>
        </nav>

        <main className="mx-auto flex max-w-6xl gap-6 p-4 md:p-6">
          <div className="flex w-full flex-col gap-4 md:w-2/3">
            
            {/* Post Yaratma Bölməsi - Yeni Community seçimi ilə */}
            <div className="flex flex-col gap-3 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <img src={user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png"} className="h-9 w-9 rounded-full bg-gray-200" />
                <input 
                  value={postInput} 
                  onChange={(e) => setPostInput(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleAddPost()}
                  placeholder="Nə düşünürsünüz?" 
                  className="flex-1 rounded-md bg-gray-100 dark:bg-[#272729] border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm outline-none" 
                />
              </div>
              <div className="flex justify-between items-center">
                <select 
                  value={selectedCommunity} 
                  onChange={(e) => setSelectedCommunity(e.target.value)}
                  className="bg-gray-100 dark:bg-[#272729] text-xs font-bold p-1.5 rounded border border-transparent outline-none cursor-pointer"
                >
                  {communities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={handleAddPost} className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-blue-700 transition">Paylaş</button>
              </div>
            </div>

            {/* Filterlər */}
            <div className="flex gap-2 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-2">
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

            {/* Post Siyahısı */}
            {loading ? <div className="text-center py-10 animate-pulse text-gray-500 font-bold italic">Postlar sıralanır...</div> : 
              posts.map((post) => (
                <div key={post.id} className="flex flex-col rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] shadow-sm overflow-hidden">
                  <div className="flex">
                    <div className="flex w-10 flex-col items-center bg-gray-50 dark:bg-[#151516] p-2 border-r dark:border-zinc-800">
                      <button onClick={() => {
                        updateDoc(doc(db, "posts", post.id), { votes: increment(1) });
                        toast('Səs verildi!', { icon: '⬆️' });
                      }} className="text-gray-400 hover:text-orange-600"><ArrowBigUp size={28} /></button>
                      <span className="text-xs font-bold py-1">{post.votes}</span>
                      <button onClick={() => updateDoc(doc(db, "posts", post.id), { votes: increment(-1) })} className="text-gray-400 hover:text-blue-600"><ArrowBigDown size={28} /></button>
                    </div>
                    <div className="flex flex-col p-3 w-full">
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase">{post.community}</span>
                        <span>• u/{post.author} • {formatTime(post.createdAt)}</span>
                      </div>
                      <h2 className="text-lg font-semibold mb-2">{post.title}</h2>
                      <div className="flex gap-4 text-xs font-bold text-gray-500">
                        <button onClick={() => setOpenPostId(openPostId === post.id ? null : post.id)} className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded">
                          <MessageSquare size={18} /> {post.comments} Şərh
                        </button>
                        <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded"><Share2 size={18} /> Paylaş</button>
                      </div>
                    </div>
                  </div>
                  {openPostId === post.id && <InlineComments postId={post.id} user={user} />}
                </div>
              ))
            }
          </div>

          {/* Sağ tərəf bölməsi (Community qaydaları və s. əlavə edilə bilər) */}
          <div className="hidden w-1/3 flex-col gap-4 md:flex">
            <div className="rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] overflow-hidden">
               <div className="h-10 bg-blue-600 p-2 flex items-center uppercase text-white font-bold text-xs px-4">Populyar İcmalar</div>
               <div className="p-2 flex flex-col gap-2">
                  {communities.map(c => (
                    <div key={c} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded cursor-pointer transition">
                      <span className="text-sm font-semibold">{c}</span>
                      <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold">Qoşul</button>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}