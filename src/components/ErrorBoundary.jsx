import { Component } from 'react';

// Evita que un error en cualquier tab tumbe toda la app en pantalla blanca.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary atrapó un error:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || 'Error desconocido';
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#131A23',
              color: '#E8ECF1',
              borderRadius: 10,
              padding: 24,
              border: '0.5px solid #EF535055',
              maxWidth: 480,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: '#EF5350', marginBottom: 8 }}>
              Algo se rompió
            </div>
            <div style={{ fontSize: 13, color: '#8899AA', marginBottom: 14, lineHeight: 1.5 }}>
              {msg}
              <br />
              <span style={{ color: '#5C6F82', fontSize: 12 }}>
                Los demás datos deberían seguir funcionando tras recargar.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={this.reset}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: '#4FC3F7',
                  color: '#000',
                  border: 'none',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Reintentar
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: 'transparent',
                  color: '#8899AA',
                  border: '0.5px solid #2A3A4D',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
