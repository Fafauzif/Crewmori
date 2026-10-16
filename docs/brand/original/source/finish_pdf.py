"""Add navigable section bookmarks and metadata without rasterizing the PDF."""
from pathlib import Path
import json,sys
import fitz

def finish(source, output, index):
    doc=fitz.open(source)
    pages=json.loads(Path(index).read_text())
    sections={1:'Crewmori brand guidelines',3:'Brand foundation',7:'Logo system',16:'Visual system',28:'Applications',39:'Implementation'}
    toc=[]
    for i,item in enumerate(pages,1):
        if i in sections:toc.append([1,sections[i],i])
        title=item.get('title')
        if title and (i not in sections or title!=sections[i]):toc.append([2,title,i])
    doc.set_toc(toc)
    doc.set_metadata({'title':'Crewmori Brand Identity Guidelines','author':'Crewmori','subject':'Working Seam identity system, version 1.0','keywords':'Crewmori, brand identity, Working Seam, logo, typography, colors','creator':'Crewmori guideline source','producer':'Crewmori brand package'})
    doc.save(output,garbage=4,deflate=True)
    doc.close()
    check=fitz.open(output)
    assert len(check)==40
    assert len(check.get_toc())>=40
    assert all(page.get_text().strip() for page in check)
    print({'pdf':str(output),'pages':len(check),'bookmarks':len(check.get_toc())})

if __name__=='__main__':
    finish(Path(sys.argv[1]),Path(sys.argv[2]),Path(sys.argv[3]))
