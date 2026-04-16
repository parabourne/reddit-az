"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, MessageSquare, Trash2, Edit3, 
  Sun, Moon, Award, Calendar, X,
  LogOut, ArrowBigUp, GraduationCap
} from "lucide-react";
import { db, auth } from "../lib/firebase"; 
import { 
  collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, orderBy, getDoc
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";

const formatTime = (timestamp: any) => {
  if (!timestamp) return "indi";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true, locale: az });
  } catch (err) { return "indi"; }
};

export default function Profile() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showUniModal, setShowUniModal] = useState(false);
  const [selectedUni, setSelectedUni] = useState("");
  const universityList = ["BDU", "ADNSU", "UNEC", "BMU", "ADA", "BANM", "AzUAC", "ATU", "ADPU", "LDU", "Digər"];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);

        // Profil məlumatlarını Firebase-dən al
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
          setSelectedUni(userDoc.data().university || "");
        }
        
        const q = query(
          collection(db, "posts"),
          where("authorId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );

        const unsubscribePosts = onSnapshot(q, (snapshot) => {
          setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        }, (err) => {
          console.error(err);
          setLoading(false);
        });

        return () => unsubscribePosts();
      } else {
        const timer = setTimeout(() => {
          if (!auth.currentUser || auth.currentUser.isAnonymous) window.location.href = "/";
        }, 2000);
        return () => clearTimeout(timer);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSaveUniversity = async () => {
    if (!selectedUni || !user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { university: selectedUni });
      setUserProfile((prev: any) => ({ ...prev, university: selectedUni }));
      setShowUniModal(false);
      toast.success(`Universitet yeniləndi: ${selectedUni}`);
    } catch (err) {
      toast.error("Xəta baş verdi!");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const handleDelete = async (postId: string) => {
    if (confirm("Bu postu silmək istədiyinizə əminsiniz?")) {
      try {
        await deleteDoc(doc(db, "posts", postId));
        toast.success("Post silindi!");
      } catch (err) { toast.error("Xəta baş verdi!"); }
    }
  };

  const handleEdit = async (postId: string, oldTitle: string) => {
    const newTitle = prompt("Yeni başlığı daxil edin:", oldTitle);
    if (newTitle && newTitle !== oldTitle) {
      try {
        await updateDoc(doc(db, "posts", postId), { title: newTitle });
        toast.success("Başlıq yeniləndi!");
      } catch (err) { toast.error("Xəta baş verdi!"); }
    }
  };

  const totalKarma = userPosts.reduce((acc, post) => acc + (post.votes || 0), 0);

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen transition-colors duration-300`}>
      <Toaster position="bottom-right" />

      {/* UNİVERSİTET DEYİŞDİR MODALI */}
      {showUniModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1A1A1B] p-6 rounded-2xl shadow-2xl border border-blue-500/30 text-center animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Universiteti Dəyişdir 🎓</h2>
              <button onClick={() => setShowUniModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
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
            <button
              onClick={handleSaveUniversity}
              disabled={!selectedUni}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-md active:scale-95"
            >
              Yadda Saxla
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#DAE0E6] dark:bg-[#030303] min-h-screen text-zinc-900 dark:text-zinc-100 font-sans">
        <nav className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white dark:bg-[#1A1A1B] px-4 md:px-20 border-b dark:border-zinc-800 shadow-sm">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="bg-orange-600 p-1.5 rounded-full text-white font-bold h-9 w-9 flex items-center justify-center shadow-lg">M</div>
            <h1 className="hidden md:block text-xl font-bold tracking-tight">reddaz.com</h1>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition">
              {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
            {user && (
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-500 transition">
                <LogOut size={20} /> <span className="hidden md:block">Çıxış</span>
              </button>
            )}
          </div>
        </nav>

        <main className="mx-auto flex max-w-6xl gap-6 p-4 md:p-6">
          <div className="flex w-full flex-col gap-4 md:w-2/3">
            <Link href="/" className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline mb-2">
              <ArrowLeft size={14} /> ANA SƏHİFƏYƏ QAYIT
            </Link>

            {/* PROFİL KARTI */}
            <div className="flex flex-col gap-4 rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <img src={user?.photoURL} className="h-20 w-20 rounded-full border-4 border-orange-500 shadow-md" alt="avatar" />
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold leading-tight">{user?.displayName}</h2>
                  <p className="text-gray-500 text-sm italic">u/{user?.displayName?.replace(/\s+/g, '').toLowerCase()}</p>
                  {/* UNİVERSİTET BADGEi */}
                  <button
                    onClick={() => setShowUniModal(true)}
                    className="flex items-center gap-1.5 w-fit mt-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                  >
                    <GraduationCap size={14} />
                    {userProfile?.university && userProfile.university !== "Seçilməyib"
                      ? userProfile.university
                      : "Universitet əlavə et"}
                  </button>
                </div>
              </div>

              {/* STATİSTİKA */}
              <div className="flex gap-6 border-t dark:border-zinc-800 pt-4 mt-2">
                <div className="flex flex-col">
                  <span className="text-lg font-bold flex items-center gap-1">
                    <Award size={16} className="text-orange-500" /> {totalKarma}
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Karma</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold flex items-center gap-1">
                    <Calendar size={16} className="text-blue-500" /> {userPosts.length}
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Paylaşımlar</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold flex items-center gap-1">
                    <MessageSquare size={16} className="text-green-500" />
                    {userPosts.reduce((acc, post) => acc + (post.comments || 0), 0)}
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Şərhlər</span>
                </div>
              </div>
            </div>

            <h3 className="text-xs font-bold text-gray-500 uppercase px-1 mt-4 tracking-widest">Paylaşımlarım</h3>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-zinc-800 rounded"></div>)}
              </div>
            ) : userPosts.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-[#1A1A1B] rounded border border-dashed dark:border-zinc-800 opacity-50">
                Hələ heç bir post paylaşmamısınız.
              </div>
            ) : (
              userPosts.map((post) => (
                <div key={post.id} className="flex flex-col rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] shadow-sm overflow-hidden">
                  <div className="flex p-4">
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{post.community}</span>
                          <span>• {formatTime(post.createdAt)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(post.id, post.title)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded transition">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(post.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded transition">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <h2 className="text-lg font-semibold mb-2 leading-tight">{post.title}</h2>
                      
                      {post.imageUrl && (
                        <div className="my-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-900 flex justify-center border dark:border-zinc-800 shadow-sm">
                          <img src={post.imageUrl} className="max-h-80 w-auto object-contain" alt={post.title} />
                        </div>
                      )}

                      {post.isCrosspost && (
                        <div className="mb-3 p-2 border-l-4 border-orange-500 bg-gray-50 dark:bg-zinc-900/50 rounded-r text-[11px]">
                          <p className="text-gray-500 italic">Yenidən paylaşıldı: <span className="font-bold text-orange-600">{post.originalCommunity}</span> • u/{post.originalAuthor}</p>
                        </div>
                      )}

                      <div className="flex gap-4 text-xs font-bold text-gray-500 mt-2">
                        <span className="flex items-center gap-1"><ArrowBigUp size={16} /> {post.votes || 0} Səs</span>
                        <span className="flex items-center gap-1"><MessageSquare size={16} /> {post.comments || 0} Şərh</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <aside className="hidden w-1/3 flex-col gap-4 md:flex">
            {/* Profil xülasəsi sidebar */}
            <div className="rounded border border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#1A1A1B] overflow-hidden shadow-sm">
              <div className="h-10 bg-orange-600 p-2 flex items-center uppercase text-white font-bold text-[10px] px-4">Profil Xülasəsi</div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <img src={user?.photoURL} className="h-12 w-12 rounded-full border-2 border-orange-500" alt="avatar" />
                  <div>
                    <p className="font-bold text-sm">{user?.displayName}</p>
                    <p className="text-xs text-gray-500">u/{user?.displayName?.replace(/\s+/g, '').toLowerCase()}</p>
                  </div>
                </div>
                {userProfile?.university && userProfile.university !== "Seçilməyib" && (
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg">
                    <GraduationCap size={16} />
                    <span className="text-sm font-bold">{userProfile.university}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 border-t dark:border-zinc-800 pt-3">
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-2 text-center">
                    <p className="font-bold text-orange-500">{totalKarma}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Karma</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-2 text-center">
                    <p className="font-bold text-blue-500">{userPosts.length}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Post</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUniModal(true)}
                  className="w-full text-xs font-bold text-blue-600 hover:underline text-center py-1"
                >
                  Universiteti dəyişdir
                </button>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}