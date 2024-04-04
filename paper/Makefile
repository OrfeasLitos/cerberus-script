quick: cerberous_it.PNG  llncs.cls  main.tex  net.bib  os.bib  ref.bib  sec.bib  splncs04.bst
	export TEXINPUTS=.:./src//:; \
	pdflatex --shell-escape -halt-on-error -interaction=nonstopmode main.tex; \
	touch quick; \
	rm -f *.aux *.log *.out *.toc *.lof *.lot *.bbl *.blg *.xml *-blx.bib mainNotes.bib

bib: cerberous_it.PNG  llncs.cls  main.tex  net.bib  os.bib  ref.bib  sec.bib  splncs04.bst
	export TEXINPUTS=.:./src//:; \
	pdflatex --shell-escape -halt-on-error -interaction=nonstopmode main.tex; \
	bibtex main.aux; \
	pdflatex --shell-escape -halt-on-error -interaction=nonstopmode main.tex; \
	pdflatex --shell-escape -halt-on-error -interaction=nonstopmode main.tex; \
	touch quick bib; \
	rm -f *.aux *.log *.out *.toc *.lof *.lot *.bbl *.blg *.xml *-blx.bib mainNotes.bib

main.pdf: clean bib

clean:
	rm -rf *.aux *.log *.out *.toc *.lof *.lot *.bbl *.blg *.xml *-blx.bib *.pdf quick bib src/figures/auto-tikz/ mainNotes.bib
