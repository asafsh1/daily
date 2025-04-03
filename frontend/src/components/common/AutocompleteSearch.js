import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const AutocompleteSearch = ({ 
  items, 
  onSelect, 
  placeholder, 
  initialValue, 
  displayProperty, 
  idProperty 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    // Set initial value if provided
    if (initialValue) {
      const item = items.find(item => 
        item[idProperty] === initialValue || 
        item._id === initialValue
      );
      
      if (item) {
        setSelectedItem(item);
        setInputValue(item[displayProperty]);
      }
    }
  }, [initialValue, items, displayProperty, idProperty]);

  useEffect(() => {
    // Filter items based on input value
    if (inputValue.trim() === '' && selectedItem) {
      setFilteredItems([]);
      return;
    }
    
    const filtered = items.filter(item => 
      item[displayProperty]?.toLowerCase().includes(inputValue.toLowerCase())
    );
    
    setFilteredItems(filtered);
  }, [inputValue, items, displayProperty, selectedItem]);

  useEffect(() => {
    // Handle clicks outside the component
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        
        // Reset to selected value if we have one, or clear if we don't
        if (selectedItem) {
          setInputValue(selectedItem[displayProperty]);
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedItem, displayProperty]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(true);
    
    // Clear the selected item if the input is deleted
    if (value === '') {
      setSelectedItem(null);
      onSelect(null);
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setInputValue(item[displayProperty]);
    setIsOpen(false);
    onSelect(item);
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="form-control"
        onClick={() => setIsOpen(true)}
      />
      
      {isOpen && filteredItems.length > 0 && (
        <ul className="autocomplete-items">
          {filteredItems.map((item, index) => (
            <li 
              key={item[idProperty] || item._id || index}
              onClick={() => handleItemClick(item)}
            >
              <div className="item-name">{item[displayProperty]}</div>
              {item[idProperty] && (
                <div className="item-id">{item[idProperty]}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .autocomplete-wrapper {
          position: relative;
          width: 100%;
        }
        
        .autocomplete-items {
          position: absolute;
          border: 1px solid #ddd;
          border-top: none;
          z-index: 99;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 200px;
          overflow-y: auto;
          background-color: white;
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
          box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
          padding: 0;
          margin: 0;
          list-style-type: none;
        }
        
        .autocomplete-items li {
          padding: 10px;
          cursor: pointer;
          border-bottom: 1px solid #f1f1f1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .autocomplete-items li:hover {
          background-color: #f1f1f1;
        }
        
        .item-name {
          font-weight: bold;
        }
        
        .item-id {
          color: #666;
          font-size: 0.85em;
        }
      `}</style>
    </div>
  );
};

AutocompleteSearch.propTypes = {
  items: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  initialValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  displayProperty: PropTypes.string.isRequired,
  idProperty: PropTypes.string.isRequired
};

AutocompleteSearch.defaultProps = {
  placeholder: 'Search...',
  displayProperty: 'name',
  idProperty: '_id'
};

export default AutocompleteSearch; 