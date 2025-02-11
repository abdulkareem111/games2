// Dynamically renders the End Game Modal
function renderEndGameScreen() {
  // Prevent duplicate insertion if modal already exists
  if (document.getElementById('endGameModal')) return;
  const modalHTML = `
  <div class="modal fade" id="endGameModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="endGameModalLabel" aria-hidden="true">
    <!-- ...existing modal content... -->
    <div class="modal-dialog">
      <div class="modal-content bg-dark text-light">
        <div class="modal-header">
          <h5 class="modal-title" id="endGameModalLabel">Game Over!</h5>
          <!-- Removed closable button -->
        </div>
        <div class="modal-body" id="endGameDetails">
          <!-- Final scores/standings will go here -->
        </div>
        <div class="modal-footer">
          <button id="goHomeButton" class="btn btn-primary" onclick="window.location.href='/'">Go Home</button>
        </div>
      </div>
    </div>
  </div>`;
  
  const container = document.createElement('div');
  container.innerHTML = modalHTML;
  document.body.insertAdjacentElement('beforeend', container.firstElementChild);
}