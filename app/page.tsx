"use client";

import { useState, useEffect } from "react";
import { 
  ArrowBigUp, ArrowBigDown, MessageSquare, Share2, 
  Search, Flame, Sun, Moon, Send, ChevronDown, Plus, X,
  Facebook, LogIn, LogOut, User, ImagePlus, Loader2 
} from "lucide-react";
import { db, auth, storage } from "./lib/firebase"; 
import { 
  collection, addDoc, updateDoc, doc, query, orderBy, 
  serverTimestamp, onSnapshot, where, increment, getDoc, setDoc 
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

const googleProvider = new GoogleAuthProvider();

const formatTime = (timestamp: any) => {
  if (!timestamp) return "indi";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true, locale: az });
  } catch (err) { return "indi"; }
};

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
    if (user?.isAnonymous) return toast.error("Şərh yazmaq üçün giriş edin!");
    try {
      await addDoc(collection(db, "comments"), {
        postId,
        text: input,
        author: user?.displayName || "Anonim",
        authorImg: user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
        authorId: user?.uid,
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
            placeholder={user?.isAnonymous ? "Şərh yazmaq üçün giriş edin..." : "Şərhinizi yazın..."} 
            disabled={user?.isAnonymous}
            className="w-full bg-white dark:bg-[#272729] border border-gray-200 dark:border-zinc-700 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
          />
          {!user?.isAnonymous && <button onClick={handleAddComment} className="absolute right-2 top-1.5 text-orange-600"><Send size={20} /></button>}
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

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [postInput, setPostInput] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); 
  const [selectedCommunity, setSelectedCommunity] = useState(""); 
  const [activeCommunity, setActiveCommunity] = useState<string | null>(null); 
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("Yeni");
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [communities, setCommunities] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [showWelcome, setShowWelcome] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const [showUniModal, setShowUniModal] = useState(false);
  const [selectedUni, setSelectedUni] = useState("");
  const universityList = ["BDU", "ADNSU", "UNEC", "BMU", "ADA", "BANM", "AzUAC", "ATU", "ADPU", "LDU", "Digər"];

  useEffect(() => {
    if (showWelcome && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setShowWelcome(false);
    }
  }, [countdown, showWelcome]);

  useEffect(() => {
    const communitiesRef = collection(db, "communities");
    const q = query(communitiesRef, orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => doc.data().name);
      setCommunities(fetched);
      if (fetched.length > 0 && !selectedCommunity) {
        setSelectedCommunity(fetched[0]);
      }
    });
    return () => unsubscribe();
  }, [selectedCommunity]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          // hasAccess-i həmişə true et, köhnə false dəyərini yenilə
          if (!data.hasAccess) {
            await updateDoc(userDocRef, { hasAccess: true });
          }
          setUserProfile({ ...data, hasAccess: true });
          if (!data.university || data.university === "Seçilməyib") {
            setShowUniModal(true);
          }
        } else {
          // Doc yoxdursa yarat - hasAccess: true ilə
          await setDoc(userDocRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            hasAccess: true,
            university: "Seçilməyib",
            createdAt: serverTimestamp(),
          });
          setUserProfile({ hasAccess: true, university: "Seçilməyib" });
          setShowUniModal(true);
          toast.success("Xoş gəldiniz!");
        }
      } else {
        setUser(null);
        await signInAnonymously(auth);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveUniversity = async () => {
    if (!selectedUni || !user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { university: selectedUni });
      setUserProfile((prev: any) => ({ ...prev, university: selectedUni }));
      setShowUniModal(false);
      toast.success(`Universitet: ${selectedUni}`);
    } catch (err) {
      toast.error("Xəta baş verdi!");
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) { toast.error("Giriş xətası!"); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUserProfile(null);
    toast.success("Çıxış edildi");
  };

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
    });
    return () => unsubscribe();
  }, [activeFilter, activeCommunity]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) return toast.error("Maksimum 5MB!");
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddPost = async () => {
    if ((!postInput.trim() && !imageFile) || user?.isAnonymous) return;
    const loadingToast = toast.loading("Paylaşılır...");
    try {
      let imageUrl = "";
      if (imageFile) {
        const storageRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
        const uploadTask = await uploadBytesResumable(storageRef, imageFile);
        imageUrl = await getDownloadURL(uploadTask.ref);
      }
      await addDoc(collection(db, "posts"), {
        title: postInput,
        imageUrl: imageUrl,
        community: selectedCommunity,
        author: user?.displayName || "İstifadəçi",
        authorImg: user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
        authorId: user?.uid,
        authorUniversity: userProfile?.university || "Seçilməyib",
        votes: 1,
        upvotedBy: [user?.uid],
        downvotedBy: [],
        comments: 0,
        createdAt: serverTimestamp()
      });
      setPostInput("");
      setImageFile(null);
      setImagePreview(null);
      toast.success("Post paylaşıldı!", { id: loadingToast });
    } catch (err) { toast.error("Xəta!", { id: loadingToast }); }
  };

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    if (!user || user.isAnonymous) return toast.error("Səs vermək üçün giriş edin!");
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
      await updateDoc(postRef, { votes: newVotes, upvotedBy: newUpvotedBy, downvotedBy: newDownvotedBy });
    } catch (err) { toast.error("Xəta!"); }
  };

  const handleCrosspost = async (originalPost: any) => {
    if (!user || user.isAnonymous) return toast.error("Paylaşmaq üçün giriş edin!");
    const loadingToast = toast.loading("Yenidən paylaşılır...");
    try {
      await addDoc(collection(db, "posts"), {
        title: originalPost.title,
        imageUrl: originalPost.imageUrl || "",
        community: selectedCommunity, 
        author: user?.displayName || "İstifadəçi",
        authorImg: user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
        authorId: user?.uid,
        authorUniversity: userProfile?.university || "Seçilməyib",
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
    } catch (err) { toast.error("Xəta!", { id: loadingToast }); }
  };

  const filteredPosts = posts.filter((post) =>
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.community?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen transition-colors duration-300`}>
      <Toaster position="bottom-right" />

      {showUniModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1A1A1B] p-6 rounded-2xl shadow-2xl border border-blue-500/30 text-center animate-in zoom-in duration-300">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full w-fit mx-auto mb-4">
              <User className="text-blue-600" size={28} />
            </div>
            <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Profilini Tamamla 🎓</h2>
            <div className="grid grid-cols-2 gap-2 mb-6 text-left">
              {universityList.map((uni) => (
                <button
                  key={uni}
                  onClick={() => setSelectedUni(uni)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    selectedUni === uni 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600" 
                      : "border-gray-100 dark:border-zinc-800 hover:border-blue-300"
                  }`}
                >
                  {uni}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleSaveUniversity} disabled={!selectedUni} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-md active:scale-95">Yadda Saxla</button>
              <button onClick={() => setShowUniModal(false)} className="text-xs text-gray-400 hover:text-gray-600 transition underline">İndi yox, sonra</button>
            </div>
          </div>
        </div>
      )}

      {showWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-center">
          <div className="relative w-full max-w-md transform rounded-2xl bg-white dark:bg-[#1A1A1B] p-8 shadow-2xl animate-in zoom-in duration-300 border border-orange-500/20">
            <button onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 text-gray-400"><X size={20} /></button>
            <div className="bg-orange-600 p-3 rounded-full text-white mx-auto w-fit mb-4 shadow-lg shadow-orange-500/20"><Flame size={32} /></div>
            <h2 className="text-2xl font-bold mb-2">Reddaz-a Xoş Gəlmisiniz!</h2>
            <button onClick={() => setShowWelcome(false)} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl transition shadow-md active:scale-95 mb-4">Anladım, başlayaq!</button>
            <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-gray-400 uppercase tracking-widest"><div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />Pəncərə {countdown} saniyəyə bağlanacaq</div>
          </div>
        </div>
      )}

      <div className="bg-[#DAE0E6] dark:bg-[#030303] min-h-screen text-zinc-900 dark:text-zinc-100 font-sans">
        <nav className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white dark:bg-[#1A1A1B] px-4 md:px-20 border-b dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setActiveCommunity(null); setSearchQuery("");}}>
            <div className="bg-orange-600 p-1.5 rounded-full text-white font-bold h-9 w-9 flex items-center justify-center shadow-lg">M</div>
            <h1 className="hidden md:block text-xl font-bold tracking-tight">reddaz.com</h1>
          </div>
          <div className="flex-1 max-w-xl mx-4"><div className="relative group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} /><input type="text" placeholder="Axtar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-100 dark:bg-[#272729] rounded-full py-1.5 pl-10 pr-10 outline-none text-sm transition-all" /></div></div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition">{isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}</button>
            {user && !user.isAnonymous ? (<div className="flex items-center gap-2"><Link href="/profile"><img src={user.photoURL} className="h-8 w-8 rounded-full border dark:border-zinc-700" alt="profile" /></Link><button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500 transition"><LogOut size={20} /></button></div>) : (<button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold transition flex items-center gap-2 shadow-md"><LogIn size={18} /> Giriş</button>)}
          </div>
        </nav>

        <main className="mx-auto flex max-w-6xl gap-6 p-4 md:p-6">
          <div className="flex w-full flex-col gap-4 md:w-2/3">
            {activeCommunity && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-md shadow-sm">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Göstərilir: <span className="underline">{activeCommunity}</span></p>
                <button onClick={() => setActiveCommunity(null)} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-red-500 transition"><X size={14} /> Təmizlə</button>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-4 shadow-sm">
              <div className="flex items-center gap-3"><img src={user?.photoURL || "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png"} className="h-9 w-9 rounded-full" alt="user" /><input value={postInput} onChange={(e) => setPostInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddPost()} placeholder="Nə düşünürsünüz?" disabled={user?.isAnonymous} className="flex-1 rounded-md bg-gray-100 dark:bg-[#272729] px-4 py-2 text-sm outline-none disabled:opacity-50" />{!user?.isAnonymous && <label className="cursor-pointer text-blue-500"><ImagePlus size={22} /><input type="file" accept="image/*" className="hidden" onChange={handleImageChange} /></label>}</div>
              
              {imagePreview && (
                <div className="relative mt-2 flex justify-start">
                  <div className="relative inline-block bg-black/5 dark:bg-white/5 rounded-lg border dark:border-zinc-800 shadow-inner overflow-hidden">
                    <img src={imagePreview} className="max-h-40 w-auto object-contain p-2" alt="preview" />
                    <button onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black transition"><X size={14} /></button>
                  </div>
                </div>
              )}

              {!user?.isAnonymous && (<div className="flex justify-between items-center border-t dark:border-zinc-800 pt-3"><select value={selectedCommunity} onChange={(e) => setSelectedCommunity(e.target.value)} className="bg-gray-100 dark:bg-[#272729] text-xs font-bold p-1.5 rounded outline-none">{communities.map(c => <option key={c} value={c}>{c}</option>)}</select><button onClick={handleAddPost} className="bg-blue-600 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-md transform active:scale-95">Paylaş</button></div>)}
            </div>

            {!activeCommunity && !searchQuery && (<div className="flex gap-2 p-2 overflow-x-auto">{["Trend", "Yeni", "Top"].map((f) => (<button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeFilter === f ? "bg-white dark:bg-zinc-800 text-blue-500 shadow-inner" : "text-gray-500"}`}>{f}</button>))}</div>)}

            {loading ? (<div className="space-y-4 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-zinc-800 rounded"></div>)}</div>) : filteredPosts.length === 0 ? (<div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1A1A1B] rounded border border-dashed dark:border-zinc-800"><Search size={48} className="text-gray-200 mb-4" /><p className="text-gray-500 font-medium">Nəticə tapılmadı.</p></div>) : (
              filteredPosts.map((post) => (
                <div key={post.id} className="flex flex-col rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] shadow-sm overflow-hidden">
                  <div className="flex">
                    <div className="flex w-10 flex-col items-center bg-gray-50 dark:bg-[#151516] p-2 border-r dark:border-zinc-800">
                      <button onClick={() => handleVote(post.id, 'up')} className={`${post.upvotedBy?.includes(user?.uid) ? "text-orange-600" : "text-gray-400"}`}><ArrowBigUp size={28} fill={post.upvotedBy?.includes(user?.uid) ? "currentColor" : "none"} /></button>
                      <span className="text-xs font-bold py-1">{post.votes}</span>
                      <button onClick={() => handleVote(post.id, 'down')} className={`${post.downvotedBy?.includes(user?.uid) ? "text-blue-600" : "text-gray-400"}`}><ArrowBigDown size={28} fill={post.downvotedBy?.includes(user?.uid) ? "currentColor" : "none"} /></button>
                    </div>
                    <div className="flex flex-col p-3 w-full">
                      <div className="flex items-center flex-wrap gap-2 text-[10px] text-gray-500 mb-1">
                        <span onClick={() => setActiveCommunity(post.community)} className="font-bold text-zinc-900 dark:text-zinc-100 uppercase hover:underline cursor-pointer">{post.community}</span>
                        <span>• u/{post.author}</span>
                        {post.authorUniversity && (<span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">{post.authorUniversity}</span>)}
                        <span>• {formatTime(post.createdAt)}</span>
                      </div>
                      <h2 className="text-lg font-semibold mb-2 leading-tight">{post.title}</h2>
                      
                      {post.imageUrl && (
                        <div className="my-2 flex justify-start">
                          <div className="rounded-lg overflow-hidden border dark:border-zinc-800 shadow-sm bg-black/5 dark:bg-white/5 inline-block">
                             <img src={post.imageUrl} className="max-h-[320px] w-auto object-contain" alt={post.title} loading="lazy" />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 text-xs font-bold text-gray-500 pt-2">
                        <button onClick={() => setOpenPostId(openPostId === post.id ? null : post.id)} className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded transition"><MessageSquare size={18} /> {post.comments || 0} Şərh</button>
                        <button onClick={() => handleCrosspost(post)} className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded transition"><Share2 size={18} /> Paylaş</button>
                      </div>
                    </div>
                  </div>
                  {openPostId === post.id && <InlineComments postId={post.id} user={user} />}
                </div>
              ))
            )}
          </div>

          <aside className="hidden w-1/3 flex-col gap-4 md:flex">
            {user?.isAnonymous && (<div className="p-4 bg-orange-600 text-white rounded shadow-lg animate-in fade-in zoom-in duration-300"><h3 className="font-bold mb-1 flex items-center gap-2 text-sm"><Flame size={18} /> Müzakirələrə qoşulun!</h3><button onClick={handleLogin} className="w-full bg-white text-orange-600 py-1.5 rounded-md font-bold text-xs shadow-md hover:bg-gray-100 transition flex items-center justify-center gap-2 mt-2"><LogIn size={14} /> Giriş et</button></div>)}
            <div className="rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] overflow-hidden shadow-sm">
                <div className="h-10 bg-blue-600 p-2 flex items-center uppercase text-white font-bold text-[10px] px-4">Populyar İcmalar</div>
                <div className="p-2 flex flex-col gap-1">
                   <div onClick={() => setActiveCommunity(null)} className={`flex items-center gap-3 p-2 rounded cursor-pointer transition text-sm font-semibold ${!activeCommunity ? "bg-gray-100 dark:bg-zinc-800" : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"}`}>🏠 Hamısı</div>
                   {communities.map(c => (<div key={c} onClick={() => setActiveCommunity(c)} className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${activeCommunity === c ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600" : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"}`}><span className="text-sm font-semibold">{c}</span></div>))}
                </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}