"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Product = {
    id: string;
    name: string;
    sku: string;
    vendor: string;
    vendorIdentifier?: string;
    brand?: string;
    priceCents: number;
    collectionId: string;
    collection?: { name: string };
    imagesJson?: string;
    description?: string;
};

type Collection = {
    id: string;
    name: string;
    slug: string;
    description?: string;
};

type ViewType = 'products' | 'collections' | 'inventory';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [viewType, setViewType] = useState<ViewType>('products');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCollection, setSelectedCollection] = useState<string>('');
    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [form, setForm] = useState<any>({ vendor: "OTHER", priceCents: 0 });
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showAddCollection, setShowAddCollection] = useState(false);
    const [showEditCollectionModal, setShowEditCollectionModal] = useState<string | null>(null);
    const [showEditProductModal, setShowEditProductModal] = useState<string | null>(null);
    const [collectionForm, setCollectionForm] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterProducts();
    }, [products, searchTerm, selectedCollection, selectedVendor]);

    async function fetchData() {
        try {
            const [productsData, collectionsData] = await Promise.all([
                api("/products"),
                api("/collections")
            ]);
            setProducts(productsData);
            setCollections(collectionsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function filterProducts() {
        let filtered = products.filter(product => {
            const matchesSearch = 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                '';
            
            const matchesCollection = !selectedCollection || product.collectionId === selectedCollection;
            const matchesVendor = !selectedVendor || product.vendor === selectedVendor;
            
            return matchesSearch && matchesCollection && matchesVendor;
        });
        
        setFilteredProducts(filtered);
    }

    async function onCreateProduct(e: any) {
        e.preventDefault();
        try {
            const p = await api("/products", { method: "POST", body: JSON.stringify(form) });
            setProducts(prev => [p, ...prev]);
            e.currentTarget.reset();
            setForm({ vendor: "OTHER", priceCents: 0 });
            setShowAddProduct(false);
        } catch (error) {
            console.error('Error creating product:', error);
        }
    }

    async function onCreateCollection(e: any) {
        e.preventDefault();
        try {
            const c = await api("/collections", { method: "POST", body: JSON.stringify(collectionForm) });
            setCollections(prev => [c, ...prev]);
            e.currentTarget.reset();
            setCollectionForm({ name: '', description: '' });
            setShowAddCollection(false);
        } catch (error) {
            console.error('Error creating collection:', error);
        }
    }

    const viewOptions = [
        { value: 'products', label: 'Products', count: products.length },
        { value: 'collections', label: 'Collections', count: collections.length },
        { value: 'inventory', label: 'Inventory', count: products.length }
    ];

    const vendors = ['ALL', 'SANMAR', 'SSACTIVEWEAR', 'OTHER'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-600">Manage your product catalog and inventory</p>
                </div>
                <div className="flex gap-2">
                    {viewType === 'products' && (
                        <Button onClick={() => setShowAddProduct(true)}>Add product</Button>
                    )}
                    {viewType === 'collections' && (
                        <Button onClick={() => setShowAddCollection(true)}>Add collection</Button>
                    )}
                </div>
            </div>

            {/* View Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                {viewOptions.map(option => (
                    <button
                        key={option.value}
                        onClick={() => setViewType(option.value as ViewType)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewType === option.value
                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        {option.label} ({option.count})
                    </button>
                ))}
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <Input
                                placeholder="Search products by name, SKU, or brand..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-md"
                            />
                        </div>
                        {viewType === 'products' && (
                            <>
                                <Select 
                                    value={selectedCollection} 
                                    onChange={(e) => setSelectedCollection(e.target.value)}
                                >
                                    <option value="">All Collections</option>
                                    {collections.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </Select>
                                <Select 
                                    value={selectedVendor} 
                                    onChange={(e) => setSelectedVendor(e.target.value)}
                                >
                                    <option value="">All Vendors</option>
                                    {vendors.slice(1).map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </Select>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Products View */}
            {viewType === 'products' && (
                <>
                    {/* Add Product Form */}
                    {showAddProduct && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Add Product</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={onCreateProduct} className="grid md:grid-cols-2 gap-3">
                                    <Input 
                                        placeholder="Name" 
                                        required
                                        onChange={e => setForm({ ...form, name: e.target.value })} 
                                    />
                                    <Input 
                                        placeholder="SKU" 
                                        required
                                        onChange={e => setForm({ ...form, sku: e.target.value })} 
                                    />
                                    <Select 
                                        required
                                        onChange={e => setForm({ ...form, vendor: e.target.value })}
                                    >
                                        <option value="SANMAR">SANMAR</option>
                                        <option value="SSACTIVEWEAR">SSACTIVEWEAR</option>
                                        <option value="OTHER">OTHER</option>
                                    </Select>
                                    <Input 
                                        placeholder="Vendor Identifier" 
                                        onChange={e => setForm({ ...form, vendorIdentifier: e.target.value })} 
                                    />
                                    <Input 
                                        placeholder="Brand" 
                                        onChange={e => setForm({ ...form, brand: e.target.value })} 
                                    />
                                    <Input 
                                        placeholder="Price (cents)" 
                                        type="number" 
                                        required
                                        onChange={e => setForm({ ...form, priceCents: Number(e.target.value) })} 
                                    />
                                    <Select 
                                        required
                                        onChange={e => setForm({ ...form, collectionId: e.target.value })}
                                    >
                                        <option value="">Select Collection</option>
                                        {collections.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </Select>
                                    <div className="md:col-span-2 flex gap-2">
                                        <Button type="submit">Create Product</Button>
                                        <Button 
                                            type="button" 
                                            variant="outline"
                                            onClick={() => setShowAddProduct(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Products Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {filteredProducts.length} products
                                {selectedCollection && ` in ${collections.find(c => c.id === selectedCollection)?.name}`}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                                                <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="text-left p-3">Product</th>
                                            <th className="text-left p-3">SKU</th>
                                            <th className="text-left p-3">Collection</th>
                                            <th className="text-left p-3">Vendor</th>
                                            <th className="text-left p-3">Price</th>
                                            <th className="text-left p-3">Status</th>
                                            <th className="text-right p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                                                        {filteredProducts.map(product => (
                                    <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="font-medium">{product.name}</div>
                                                                                                         {product.brand && (
                                                         <div className="text-sm text-gray-500">{product.brand}</div>
                                                     )}
                                                </td>
                                                                                                 <td className="p-3 font-mono text-sm text-gray-600">
                                                     {product.sku}
                                                 </td>
                                                <td className="p-3">
                                                                                                         <Badge className="bg-gray-100 text-gray-800">
                                                         {product.collection?.name || '—'}
                                                     </Badge>
                                                </td>
                                                <td className="p-3">
                                                    <Badge className="bg-gray-600 text-gray-100">
                                                        {product.vendor}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 font-medium">
                                                    ${(product.priceCents / 100).toFixed(2)}
                                                </td>
                                                <td className="p-3">
                                                                                                         <Badge className="bg-green-100 text-green-800">
                                                         Active
                                                     </Badge>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Button variant="outline" size="sm" onClick={() => setShowEditProductModal(product.id)}>
                                                        Edit
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {filteredProducts.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    {searchTerm || selectedCollection || selectedVendor 
                                        ? 'No products match your filters' 
                                        : 'No products found'
                                    }
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Collections View */}
            {viewType === 'collections' && (
                <>
                    {/* Add Collection Form */}
                    {showAddCollection && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Add Collection</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={onCreateCollection} className="grid md:grid-cols-2 gap-3">
                                    <Input 
                                        placeholder="Collection Name" 
                                        required
                                        onChange={e => setCollectionForm({ ...collectionForm, name: e.target.value })} 
                                    />
                                    <Input 
                                        placeholder="Description (optional)" 
                                        onChange={e => setCollectionForm({ ...collectionForm, description: e.target.value })} 
                                    />
                                    <div className="md:col-span-2 flex gap-2">
                                        <Button type="submit">Create Collection</Button>
                                        <Button 
                                            type="button" 
                                            variant="outline"
                                            onClick={() => setShowAddCollection(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Collections Grid */}
                    <div className="grid md:grid-cols-3 gap-4">
                        {collections.map(collection => (
                                                         <Card key={collection.id} className="hover:bg-gray-50 transition-colors">
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        {collection.name}
                                                                                 <Badge className="bg-gray-100 text-gray-800">
                                             {products.filter(p => p.collectionId === collection.id).length} products
                                         </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                                                         {collection.description && (
                                         <p className="text-gray-600 mb-3">{collection.description}</p>
                                     )}
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setShowEditCollectionModal(collection.id)}>Edit</Button>
                                        <Button variant="outline" size="sm" onClick={() => setViewType('products')}>View Products</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {/* Inventory View */}
            {viewType === 'inventory' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Inventory Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-4 gap-4 mb-6">
                                                         <div className="text-center p-4 bg-gray-100 rounded-lg border border-gray-200">
                                 <div className="text-2xl font-bold text-gray-700">
                                     {products.length}
                                 </div>
                                 <div className="text-sm text-gray-600">Total Products</div>
                             </div>
                                                         <div className="text-center p-4 bg-gray-100 rounded-lg border border-gray-200">
                                 <div className="text-2xl font-bold text-gray-700">
                                     {products.filter(p => p.vendor === 'SANMAR').length}
                                 </div>
                                 <div className="text-sm text-gray-600">SanMar Products</div>
                             </div>
                                                         <div className="text-center p-4 bg-gray-100 rounded-lg border border-gray-200">
                                 <div className="text-2xl font-bold text-gray-700">
                                     {products.filter(p => p.vendor === 'SSACTIVEWEAR').length}
                                 </div>
                                 <div className="text-sm text-gray-600">S&S Products</div>
                             </div>
                                                         <div className="text-center p-4 bg-gray-100 rounded-lg border border-gray-200">
                                 <div className="text-2xl font-bold text-gray-700">
                                     {products.filter(p => p.vendor === 'OTHER').length}
                                 </div>
                                 <div className="text-sm text-gray-600">Other Products</div>
                             </div>
                        </div>
                        
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
                                                         <div className="text-center py-8 text-gray-500">
                                 No low stock alerts at this time
                             </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
