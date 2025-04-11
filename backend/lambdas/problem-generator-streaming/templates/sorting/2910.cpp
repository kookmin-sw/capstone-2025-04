// BOJ - 2910 빈도 정렬 ( EC#3 - Problem 15 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n, c; cin >> n >> c;
    map<int, int> mm, seq;
    loop(i, 1, n) {
        int k; cin >> k; mm[k]++;
        if(seq.find(k) == seq.end()) seq[k] = i;
    }
    map<int, vector<int> > mmv;
    for(const auto& kv : mm) mmv[kv.second].push_back(kv.first);

    for(int i = 1000; i >= 1; i--)
        if(mmv.find(i) != mmv.end()) {
            sort(mmv[i].begin(), mmv[i].end(), [&](int a, int b){
                return seq[a] < seq[b];
            });
            for(int v : mmv[i])
                loop(_, 1, i) cout << v << ' ';
        }
    cout << '\n';
}