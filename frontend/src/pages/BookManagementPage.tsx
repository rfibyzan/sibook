import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import type { Book, Category, Location } from '../lib/types';

const BookManagementPage: React.FC = () => {
  const { showAlert, showConfirm } = useNotification();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Searchable Select States
  const [catSearch, setCatSearch] = useState('');
  const [locSearch, setLocSearch] = useState('');
  const [showCatList, setShowCatList] = useState(false);
  const [showLocList, setShowLocList] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({
    isbn: '',
    title: '',
    author: '',
    category_id: '',
    location_id: '',
    stock: 0,
    price: 0,
  });
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: booksData } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    const { data: catData } = await supabase.from('categories').select('*').order('name', { ascending: true });
    const { data: locData } = await supabase.from('locations').select('*').order('rack_code', { ascending: true });

    if (booksData) setBooks(booksData);
    if (catData) setCategories(catData);
    if (locData) setLocations(locData);
    setIsLoading(false);
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const bookData: any = {
      isbn: newBook.isbn,
      title: newBook.title,
      author: newBook.author,
      category_id: newBook.category_id || null,
      location_id: newBook.location_id || null,
      stock: newBook.stock,
      price: newBook.price,
    };

    const { error } = editingBookId 
      ? await (supabase.from('books') as any).update(bookData).eq('id', editingBookId)
      : await (supabase.from('books') as any).insert([bookData]);

    if (!error) {
      setIsModalOpen(false);
      setEditingBookId(null);
      setNewBook({ isbn: '', title: '', author: '', category_id: '', location_id: '', stock: 0, price: 0 });
      setCatSearch('');
      setLocSearch('');
      showAlert(editingBookId ? 'Buku berhasil diperbarui!' : 'Buku berhasil ditambahkan!', 'success');
      fetchData();
    } else {
      showAlert('Gagal menyimpan data: ' + error.message, 'error');
    }
  };

  const handleEditClick = (book: Book) => {
    setEditingBookId(book.id);
    setNewBook({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      category_id: book.category_id || '',
      location_id: book.location_id || '',
      stock: book.stock,
      price: book.price
    });
    
    const cat = categories.find(c => c.id === book.category_id);
    const loc = locations.find(l => l.id === book.location_id);
    setCatSearch(cat ? cat.name : '');
    setLocSearch(loc ? `${loc.rack_code}-${loc.section}` : '');
    
    setIsModalOpen(true);
  };

  const deleteBook = (id: string) => {
    showConfirm({
      title: 'Hapus Buku',
      message: 'Apakah Anda yakin ingin menghapus buku ini dari katalog?',
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('books').delete().eq('id', id);
        if (!error) {
          showAlert('Buku telah dihapus', 'success');
          fetchData();
        } else {
          showAlert('Gagal menghapus: ' + error.message, 'error');
        }
      }
    });
  };

  const formatNumber = (num: number | string) => {
    const value = num.toString().replace(/\D/g, '');
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNumber = (str: string) => {
    return parseInt(str.replace(/\./g, '')) || 0;
  };

  const getStatusInfo = (stock: number) => {
    if (stock === 0) return { label: 'Habis', color: 'bg-error/10 text-error border-error/20' };
    if (stock < 5) return { label: 'Menipis', color: 'bg-warning/10 text-warning border-warning/20' };
    return { label: 'Tersedia', color: 'bg-primary/10 text-primary border-primary/20' };
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const filteredLocations = locations.filter(l => 
    `${l.rack_code}-${l.section}`.toLowerCase().includes(locSearch.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary">Manajemen Buku</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Kelola katalog buku langsung dari database Supabase.</p>
        </div>
        <button 
          onClick={() => {
            setNewBook({ isbn: '', title: '', author: '', category_id: '', location_id: '', stock: 0, price: 0 });
            setCatSearch('');
            setLocSearch('');
            setIsModalOpen(true);
          }}
          className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Tambah Buku
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
          <p className="mt-4 text-secondary">Memuat data buku...</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="py-4 px-8 font-label-uppercase text-secondary text-[11px] tracking-widest uppercase">ISBN</th>
                  <th className="py-4 px-8 font-label-uppercase text-secondary text-[11px] tracking-widest uppercase">Judul & Penulis</th>
                  <th className="py-4 px-8 font-label-uppercase text-secondary text-[11px] tracking-widest uppercase text-center">Stok</th>
                  <th className="py-4 px-8 font-label-uppercase text-secondary text-[11px] tracking-widest uppercase text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {books.map((book) => {
                  const status = getStatusInfo(book.stock);
                  return (
                    <tr key={book.id} className="hover:bg-primary/[0.02] group transition-colors">
                      <td className="py-5 px-8 font-mono text-secondary text-sm">{book.isbn}</td>
                      <td className="py-5 px-8">
                        <p className="font-title-md text-on-surface font-bold leading-tight">{book.title}</p>
                        <p className="text-secondary text-body-sm mt-0.5">{book.author}</p>
                      </td>
                      <td className="py-5 px-8 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${status.color}`}>
                          {formatNumber(book.stock)} {status.label}
                        </span>
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(book)}
                            className="p-2 hover:bg-primary/10 rounded-full text-secondary hover:text-primary transition-all"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => deleteBook(book.id)}
                            className="p-2 hover:bg-error/10 rounded-full text-secondary hover:text-error transition-all"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Book Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-[32px] shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-headline-sm text-on-surface">{editingBookId ? 'Edit Data Buku' : 'Tambah Buku Baru'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingBookId(null); }} className="p-2 hover:bg-surface-container rounded-full text-secondary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddBook} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">ISBN</label>
                  <input required placeholder="Contoh: 978602..." className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" value={newBook.isbn} onChange={e => setNewBook({...newBook, isbn: e.target.value})} />
                </div>
                
                {/* Searchable Category */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Kategori</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Cari atau pilih..."
                      className="w-full h-12 pl-4 pr-10 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      value={catSearch}
                      onFocus={() => setShowCatList(true)}
                      onBlur={() => setTimeout(() => setShowCatList(false), 200)}
                      onChange={(e) => {
                        setCatSearch(e.target.value);
                        setNewBook({...newBook, category_id: ''}); // Reset ID if typing
                      }}
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">expand_more</span>
                    
                    {showCatList && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        {filteredCategories.length > 0 ? filteredCategories.map(c => (
                          <div 
                            key={c.id}
                            className="px-4 py-3 hover:bg-primary/10 cursor-pointer text-sm transition-colors"
                            onClick={() => {
                              setNewBook({...newBook, category_id: c.id});
                              setCatSearch(c.name);
                              setShowCatList(false);
                            }}
                          >
                            {c.name}
                          </div>
                        )) : (
                          <div className="px-4 py-3 text-sm text-secondary italic text-center">Tidak ditemukan</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Judul Buku</label>
                  <input required placeholder="Masukkan judul lengkap" className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Penulis</label>
                  <input required placeholder="Nama pengarang" className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Searchable Location - Opens UPWARDS */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Lokasi Rak</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Cari rak..."
                      className="w-full h-12 pl-4 pr-10 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      value={locSearch}
                      onFocus={() => setShowLocList(true)}
                      onBlur={() => setTimeout(() => setShowLocList(false), 200)}
                      onChange={(e) => {
                        setLocSearch(e.target.value);
                        setNewBook({...newBook, location_id: ''});
                      }}
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">search</span>
                    
                    {showLocList && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {filteredLocations.length > 0 ? filteredLocations.map(l => (
                          <div 
                            key={l.id}
                            className="px-4 py-3 hover:bg-primary/10 cursor-pointer text-sm transition-colors flex justify-between"
                            onClick={() => {
                              setNewBook({...newBook, location_id: l.id});
                              setLocSearch(`${l.rack_code}-${l.section}`);
                              setShowLocList(false);
                            }}
                          >
                            <span className="font-bold">{l.rack_code}</span>
                            <span className="text-secondary opacity-70">{l.section}</span>
                          </div>
                        )) : (
                          <div className="px-4 py-3 text-sm text-secondary italic text-center">Rak tidak ada</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Stok Awal</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-right font-mono" 
                    value={formatNumber(newBook.stock)} 
                    onChange={e => setNewBook({...newBook, stock: parseNumber(e.target.value)})} 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Harga (Rp)</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-right font-mono" 
                    value={formatNumber(newBook.price)} 
                    onChange={e => setNewBook({...newBook, price: parseNumber(e.target.value)})} 
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingBookId(null); }} className="flex-1 py-4 border border-outline-variant rounded-full font-bold text-on-surface hover:bg-surface-container transition-all">Batal</button>
                <button type="submit" className="flex-1 py-4 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">{editingBookId ? 'check_circle' : 'add_circle'}</span>
                  {editingBookId ? 'Perbarui Data' : 'Simpan Buku'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BookManagementPage;
