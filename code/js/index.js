document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.links a').forEach(link => {
        link.addEventListener('mouseover', function() {
            this.querySelector('h4').classList.add('hover');
        });
        
        link.addEventListener('mouseout', function() {
            this.querySelector('h4').classList.remove('hover');
        });
    });
    
    const style = document.createElement('style');
    style.textContent = `
        .back-section {
            margin-top: 25px;
        }
        
        .back-link {
            display: inline-block;
            padding: 10px 20px;
            background-color: #f44336;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background-color 0.3s;
        }
        
        .back-link:hover {
            background-color: #d32f2f;
        }
        
        @media (max-width: 320px), (max-height: 651px) {
            .back-link {
                padding: 8px 15px;
                font-size: 14px;
            }
        }
    `;
    
    document.head.appendChild(style);
    
    const previewImage = document.querySelector('.preview-image');
    if (previewImage) {
        previewImage.addEventListener('error', function() {
            this.style.display = 'none';
            const container = document.querySelector('.game-preview');
            
            if (container) {
                const msgElement = document.createElement('div');
                msgElement.className = 'preview-placeholder';
                msgElement.textContent = 'Game screenshot coming soon!';
                msgElement.style.padding = '30px';
                msgElement.style.backgroundColor = '#f0f0f0';
                msgElement.style.borderRadius = '8px';
                msgElement.style.marginBottom = '15px';
                
                container.insertBefore(msgElement, container.querySelector('.preview-text'));
            }
        });
    }
});