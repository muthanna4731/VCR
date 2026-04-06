const testimonials = [
  { quote: '"Fast registration, clean documentation, and the layout is even better in person."', author: 'Deepak Shetty' },
  { quote: '"We were hesitant first-time buyers. VCR\'s team held our hand through everything."', author: 'Sowmya Krishnamurthy' },
  { quote: '"Good people. Honest pricing. The site was exactly what they showed us on paper."', author: 'Mohammed Irfan' },
  { quote: '"VCR made the whole process simple. Didn\'t feel like I needed a lawyer at every step."', author: 'Priya Nataraj' },
  { quote: '"Bought a plot in their Hebbal layout. Clear title, zero drama. Will refer to everyone."', author: 'Ravi Shankar' },
]

export default function TestimonialsSection() {
  return (
    <section className="testimonials-root" id="testimonials">
      <div className="container-container">
        <div className="testimonials-title">
          <h2>Namma <span className="em">Testimonials.</span></h2>
        </div>
        <div className="testimonials-grid">
          <div className="testimonials-grid-col">
            <div className="testimonials-divider"></div>
            <div className="testimonials-carousel">
              <div className="swiper">
                <div className="swiper-wrapper">
                  {testimonials.map((t, i) => (
                    <div key={i} className="swiper-slide">
                      <div className="testimonials-quote">
                        <p>{t.quote}</p>
                      </div>
                      <div className="testimonials-info">
                        <div className="testimonials-author">{t.author}</div>
                        <div className="testimonials-meta">
                          <div className="testimonials-separator">/</div>
                          <div className="testimonials-rating"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="swiper-pagination"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}