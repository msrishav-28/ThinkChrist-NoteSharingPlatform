export default function SearchBar() {
  return (
    <div className="relative">
      <input 
        type="text" 
        placeholder="Search..." 
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )
}

export { SearchBar }