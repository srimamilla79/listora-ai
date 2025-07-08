import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'content/blog')

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  date: string
  coverImage: string
  category: string
  readTime: string
  author: string
  keywords: string[]
  content: string
}

export function getAllPosts(): BlogPost[] {
  // Check if directory exists, return empty array if not
  if (!fs.existsSync(postsDirectory)) {
    console.log('Blog directory does not exist:', postsDirectory)
    return []
  }

  try {
    const fileNames = fs.readdirSync(postsDirectory)
    const allPostsData = fileNames
      .filter((fileName) => fileName.endsWith('.mdx'))
      .map((fileName) => {
        const slug = fileName.replace(/\.mdx$/, '')
        const fullPath = path.join(postsDirectory, fileName)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)

        return {
          slug,
          content,
          title: data.title || '',
          excerpt: data.excerpt || '',
          date: data.date || '',
          coverImage: data.coverImage || '',
          category: data.category || '',
          readTime: data.readTime || '',
          author: data.author || '',
          keywords: data.keywords || [],
        }
      })

    // Sort posts by date
    return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1))
  } catch (error) {
    console.error('Error reading blog posts:', error)
    return []
  }
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`)

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
      slug,
      content,
      title: data.title || '',
      excerpt: data.excerpt || '',
      date: data.date || '',
      coverImage: data.coverImage || '',
      category: data.category || '',
      readTime: data.readTime || '',
      author: data.author || '',
      keywords: data.keywords || [],
    }
  } catch (error) {
    console.error('Error reading blog post:', error)
    return null
  }
}
