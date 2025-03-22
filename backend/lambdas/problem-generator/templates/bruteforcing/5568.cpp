// BOJ - 5568 카드 놓기 ( EC#3 - Problem 09 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    int n, k; cin >> n >> k; vector<string> v; v.push_back("0");
    loop(i, 1, n) { string ss; cin >> ss; v.push_back(ss); }

    set<int> s;
    if(k == 2) {
        loop(i, 1, n) loop(j, 1, n) if(i != j)
            s.insert(stoi(v[i] + v[j]));
    }
    else if(k == 3) {
        loop(i, 1, n) loop(j, 1, n) loop(k, 1, n) if(i != j && j != k && i != k)
            s.insert(stoi(v[i] + v[j] + v[k]));
    }
    else if(k == 4) {
        loop(i, 1, n) loop(j, 1, n) loop(k, 1, n) loop(l, 1, n) if(i != j && j != k && k != l && i != k && j != l && i != l)
            s.insert(stoi(v[i] + v[j] + v[k] + v[l]));
    }
    cout << s.size() << '\n';
}