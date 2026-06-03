import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import type { Buku, Kategori, Rak, Supplier } from '../lib/types';
import Pagination from '../components/Pagination';

const BookManagementPage: React.FC = () => {
  const { showAlert, showConfirm, broadcastNotification } = useNotification();
  const { profile } = useAuth();
  const [books, setBooks] = useState<Buku[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [locations, setLocations] = useState<Rak[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Searchable Select States
  const [catSearch, setCatSearch] = useState('');
  const [locSearch, setLocSearch] = useState('');
  const [supSearch, setSupSearch] = useState('');
  const [showCatList, setShowCatList] = useState(false);
  const [showLocList, setShowLocList] = useState(false);
  const [showSupList, setShowSupList] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({
    isbn: '',
    judul: '',
    pengarang: '',
    penerbit: '',
    id_kategori: '',
    id_rak: '',
    id_supplier: '',
    stok_minimum: 5,
    harga_jual: 0,
  });
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredBooks = books.filter(book => 
    book.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.pengarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn.includes(searchTerm) ||
    (book.penerbit && book.penerbit.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const currentBooks = filteredBooks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: booksData } = await supabase.from('buku').select('*').order('dibuat_pada', { ascending: false });
    const { data: catData } = await supabase.from('kategori').select('*').order('nama_kategori', { ascending: true });
    const { data: locData } = await supabase.from('rak').select('*').order('kode_rak', { ascending: true });
    const { data: supData } = await supabase.from('supplier').select('*').order('nama', { ascending: true });

    if (booksData) setBooks(booksData as Buku[]);
    if (catData) setCategories(catData as Kategori[]);
    if (locData) setLocations(locData as Rak[]);
    if (supData) setSuppliers(supData as Supplier[]);
    setIsLoading(false);
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi: Kategori dan Rak wajib diisi
    if (!newBook.id_kategori) {
      showAlert('Kategori wajib dipilih! Silakan pilih kategori buku.', 'error');
      return;
    }
    if (!newBook.id_rak) {
      showAlert('Lokasi Rak wajib dipilih! Silakan pilih rak penyimpanan.', 'error');
      return;
    }

    const bookData: any = {
      isbn: newBook.isbn,
      judul: newBook.judul,
      pengarang: newBook.pengarang,
      penerbit: newBook.penerbit || null,
      id_kategori: newBook.id_kategori,
      id_rak: newBook.id_rak,
      id_supplier: null,
      stok_minimum: 5,
      harga_jual: newBook.harga_jual,
    };

    const { error } = editingBookId 
      ? await (supabase.from('buku') as any).update(bookData).eq('id', editingBookId)
      : await (supabase.from('buku') as any).insert([bookData]);

    if (!error) {
      setIsModalOpen(false);
      setEditingBookId(null);
      setNewBook({ isbn: '', judul: '', pengarang: '', penerbit: '', id_kategori: '', id_rak: '', id_supplier: '', stok_minimum: 5, harga_jual: 0 });
      setCatSearch('');
      setLocSearch('');
      setSupSearch('');
      showAlert(editingBookId ? 'Buku berhasil diperbarui!' : 'Buku berhasil ditambahkan!', 'success');
      
      const actionName = editingBookId ? 'memperbarui' : 'menambahkan';
      const titleName = editingBookId ? 'Buku Diperbarui' : 'Buku Baru';
      broadcastNotification(
        titleName,
        `${profile?.full_name || 'Admin'} (${profile?.role || 'User'}) ${actionName} buku "${newBook.judul}"`,
        'info'
      );

      fetchData();
    } else {
      showAlert('Gagal menyimpan data: ' + error.message, 'error');
    }
  };

  const handleEditClick = (book: Buku) => {
    setEditingBookId(book.id);
    setNewBook({
      isbn: book.isbn,
      judul: book.judul,
      pengarang: book.pengarang,
      penerbit: book.penerbit || '',
      id_kategori: book.id_kategori || '',
      id_rak: book.id_rak || '',
      id_supplier: book.id_supplier || '',
      stok_minimum: book.stok_minimum,
      harga_jual: book.harga_jual
    });
    
    const cat = categories.find(c => c.id === book.id_kategori);
    const loc = locations.find(l => l.id === book.id_rak);
    const sup = suppliers.find(s => s.id === book.id_supplier);
    setCatSearch(cat ? cat.nama_kategori : '');
    setLocSearch(loc ? `${loc.kode_rak}-${loc.seksi}` : '');
    setSupSearch(sup ? sup.nama : '');
    
    setIsModalOpen(true);
  };

  const deleteBook = (id: string) => {
    showConfirm({
      title: 'Hapus Buku',
      message: 'Apakah Anda yakin ingin menghapus buku ini dari katalog?',
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('buku').delete().eq('id', id);
        if (!error) {
          showAlert('Buku telah dihapus', 'success');
          
          const deletedBook = books.find(b => b.id === id);
          if (deletedBook) {
            broadcastNotification(
              'Buku Dihapus',
              `${profile?.full_name || 'Admin'} (${profile?.role || 'User'}) menghapus buku "${deletedBook.judul}"`,
              'warning'
            );
          }

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

  const getStatusInfo = (stock: number, minStock: number) => {
    if (stock === 0) return { label: 'Habis', color: 'bg-error/10 text-error border-error/20' };
    if (stock <= minStock) return { label: 'Menipis', color: 'bg-warning/10 text-warning border-warning/20' };
    return { label: 'Tersedia', color: 'bg-primary/10 text-primary border-primary/20' };
  };

  const filteredCategories = categories.filter(c => 
    c.nama_kategori.toLowerCase().includes(catSearch.toLowerCase())
  );

  const filteredLocations = locations.filter(l => 
    `${l.kode_rak}-${l.seksi}`.toLowerCase().includes(locSearch.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.nama.toLowerCase().includes(supSearch.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary text-xl sm:text-2xl lg:text-display-lg">Manajemen Buku</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1 text-sm sm:text-base">Kelola katalog buku langsung dari database Supabase.</p>
        </div>
        <button 
          onClick={() => {
            setNewBook({ isbn: '', judul: '', pengarang: '', penerbit: '', id_kategori: '', id_rak: '', id_supplier: '', stok_minimum: 5, harga_jual: 0 });
            setCatSearch('');
            setLocSearch('');
            setSupSearch('');
            setIsModalOpen(true);
          }}
          className="bg-primary text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Tambah Buku
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 sm:mb-6">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">search</span>
          <input 
            type="text" 
            placeholder="Cari judul, penulis, ISBN..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 sm:h-12 pl-12 pr-4 rounded-2xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none transition-all text-sm sm:text-base"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
          <p className="mt-4 text-secondary">Memuat data buku...</p>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {currentBooks.map((book) => {
              const status = getStatusInfo(book.stok_saat_ini, book.stok_minimum);
              return (
                <div key={book.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-title-md text-on-surface font-bold leading-tight truncate">{book.judul}</p>
                      <p className="text-secondary text-body-sm mt-0.5 truncate">
                        {book.pengarang} {book.penerbit ? `• ${book.penerbit}` : ''}
                      </p>
                      <p className="font-mono text-secondary text-[11px] mt-1">{book.isbn}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
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
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${status.color}`}>
                      {formatNumber(book.stok_saat_ini)} {status.label}
                    </span>
                    <span className="text-secondary text-body-sm font-medium">Rp {formatNumber(book.harga_jual)}</span>
                  </div>
                </div>
              );
            })}
            {currentBooks.length === 0 && (
              <div className="py-16 text-center text-secondary italic bg-surface-container-lowest rounded-2xl border border-outline-variant">
                Tidak ada buku yang sesuai dengan pencarian.
              </div>
            )}
            {totalPages > 1 && (
              <div className="rounded-2xl overflow-hidden border border-outline-variant">
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  onPageChange={setCurrentPage} 
                />
              </div>
            )}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-surface-container-lowest border border-outline-variant rounded-[32px] overflow-hidden shadow-sm">
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
                  {currentBooks.map((book) => {
                    const status = getStatusInfo(book.stok_saat_ini, book.stok_minimum);
                    return (
                      <tr key={book.id} className="hover:bg-primary/[0.02] group transition-colors">
                        <td className="py-5 px-8 font-mono text-secondary text-sm">{book.isbn}</td>
                        <td className="py-5 px-8">
                          <p className="font-title-md text-on-surface font-bold leading-tight">{book.judul}</p>
                          <p className="text-secondary text-body-sm mt-0.5">
                            {book.pengarang} {book.penerbit ? `• ${book.penerbit}` : ''}
                          </p>
                        </td>
                        <td className="py-5 px-8 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${status.color}`}>
                            {formatNumber(book.stok_saat_ini)} {status.label}
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
                  {currentBooks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-secondary italic">
                        Tidak ada buku yang sesuai dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
              />
            )}
          </div>
        </>
      )}

      {/* Add/Edit Book Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full sm:max-w-xl rounded-t-[24px] sm:rounded-[32px] shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] sm:max-h-[85vh] flex flex-col">
            <div className="p-5 sm:p-8 border-b border-outline-variant flex justify-between items-center shrink-0">
              <h3 className="font-headline-sm text-on-surface text-lg sm:text-xl">{editingBookId ? 'Edit Data Buku' : 'Tambah Buku Baru'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingBookId(null); }} className="p-2 hover:bg-surface-container rounded-full text-secondary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddBook} className="p-5 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">ISBN</label>
                  <input required placeholder="Contoh: 978602..." className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm" value={newBook.isbn} onChange={e => setNewBook({...newBook, isbn: e.target.value})} />
                </div>
                
                {/* Searchable Category */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Kategori</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Cari atau pilih..."
                      className="w-full h-12 pl-4 pr-10 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      value={catSearch}
                      onFocus={() => setShowCatList(true)}
                      onBlur={() => setTimeout(() => setShowCatList(false), 200)}
                      onChange={(e) => {
                        setCatSearch(e.target.value);
                        setNewBook({...newBook, id_kategori: ''}); // Reset ID if typing
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
                              setNewBook({...newBook, id_kategori: c.id});
                              setCatSearch(c.nama_kategori);
                              setShowCatList(false);
                            }}
                          >
                            {c.nama_kategori}
                          </div>
                        )) : (
                          <div className="px-4 py-3 text-sm text-secondary italic text-center">Tidak ditemukan</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Judul Buku</label>
                <input required placeholder="Masukkan judul lengkap" className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" value={newBook.judul} onChange={e => setNewBook({...newBook, judul: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Penulis / Pengarang</label>
                  <input required placeholder="Nama pengarang" className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" value={newBook.pengarang} onChange={e => setNewBook({...newBook, pengarang: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Penerbit</label>
                  <input placeholder="Nama penerbit" className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" value={newBook.penerbit} onChange={e => setNewBook({...newBook, penerbit: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        setNewBook({...newBook, id_rak: ''});
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
                              setNewBook({...newBook, id_rak: l.id});
                              setLocSearch(`${l.kode_rak}-${l.seksi}`);
                              setShowLocList(false);
                            }}
                          >
                            <span className="font-bold">{l.kode_rak}</span>
                            <span className="text-secondary opacity-70">{l.seksi}</span>
                          </div>
                        )) : (
                          <div className="px-4 py-3 text-sm text-secondary italic text-center">Rak tidak ada</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Harga Jual (Rp)</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-right font-mono" 
                    value={formatNumber(newBook.harga_jual)} 
                    onChange={e => setNewBook({...newBook, harga_jual: parseNumber(e.target.value)})} 
                  />
                </div>
              </div>


              <div className="pt-4 sm:pt-6 flex gap-3 sm:gap-4 pb-safe">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingBookId(null); }} className="flex-1 py-3 sm:py-4 border border-outline-variant rounded-full font-bold text-on-surface hover:bg-surface-container transition-all text-sm sm:text-base">Batal</button>
                <button type="submit" className="flex-1 py-3 sm:py-4 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm sm:text-base">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{editingBookId ? 'check_circle' : 'add_circle'}</span>
                  {editingBookId ? 'Perbarui' : 'Simpan'}
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
